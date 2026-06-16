import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import * as cheerio from "cheerio";
import { AppError } from "@/lib/errors";
import { JD_MIN_CHARS } from "@/lib/constants";

const FETCH_TIMEOUT_MS = 12_000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Source-specific containers (best effort), tried before the generic fallback.
const SOURCE_SELECTORS: Record<string, string> = {
  greenhouse: "#content, .job__description, .content",
  lever: ".posting-page .section-wrapper, .posting, [data-qa='job-description']",
  linkedin: ".show-more-less-html__markup, .description__text, .jobs-description__content",
  workday: "[data-automation-id='jobPostingDescription']",
  ashby: ".ashby-job-posting-right-pane, ._description_",
};

function detectSource(hostname: string): keyof typeof SOURCE_SELECTORS | null {
  for (const key of Object.keys(SOURCE_SELECTORS)) {
    if (hostname.includes(key)) return key;
  }
  return null;
}

function collapse(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Many job pages embed a schema.org JobPosting with the full description (even SPAs). */
function extractJsonLdJob($: cheerio.CheerioAPI): string {
  let found = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const data: unknown = JSON.parse(raw);
      const container = data as { "@graph"?: unknown };
      const nodes = Array.isArray(data)
        ? data
        : Array.isArray(container["@graph"])
          ? container["@graph"]
          : [data];
      for (const node of nodes as Array<Record<string, unknown>>) {
        const type = node?.["@type"];
        const isJob = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
        if (isJob && typeof node.description === "string") {
          found = cheerio.load(node.description).root().text();
          return;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return collapse(found);
}

/**
 * Fallback fetch using Node's lenient HTTP parser. Some servers (e.g. legacy/gov sites)
 * send slightly non-compliant headers that browsers tolerate but undici's `fetch` rejects
 * (HPE_INVALID_HEADER_TOKEN). Follows redirects and asks for an uncompressed response.
 */
function lenientFetchHtml(url: string, maxRedirects = 4): Promise<string> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      reject(new AppError("Please enter a valid URL.", 400));
      return;
    }
    const requestFn = target.protocol === "http:" ? httpRequest : httpsRequest;
    const req = requestFn(
      url,
      {
        insecureHTTPParser: true,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && maxRedirects > 0) {
          res.resume();
          lenientFetchHtml(new URL(location, url).toString(), maxRedirects - 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(
            new AppError(
              `Couldn't fetch that page (HTTP ${status}). Try pasting the description instead.`,
              422,
            ),
          );
          return;
        }
        res.setEncoding("utf8");
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      },
    );
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** Fetch page HTML: try `fetch` first, fall back to the lenient parser on a network/parse error. */
async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) {
      throw new AppError(
        `Couldn't fetch that page (HTTP ${res.status}). Try pasting the description instead.`,
        422,
      );
    }
    return await res.text();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err; // caller maps to 504
    // Non-compliant headers / connection quirk -> retry with the lenient parser.
    return await lenientFetchHtml(url);
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch a job posting URL and extract its text content (FR-03). */
export async function scrapeJobPosting(url: string): Promise<{ text: string; source: string }> {
  let html: string;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
    html = await fetchPageHtml(url);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppError("That page took too long to load. Try pasting the description instead.", 504);
    }
    throw new AppError("We couldn't reach that URL. Try pasting the description instead.", 422);
  }

  const $ = cheerio.load(html);

  // Extract structured/meta sources BEFORE stripping <script>/<meta>.
  const jsonLd = extractJsonLdJob($);
  const ogDescription = collapse($('meta[property="og:description"]').attr("content") ?? "");

  $("script, style, noscript, svg, iframe, header, footer, nav, form, button").remove();

  const source = detectSource(hostname);
  let domText = "";
  if (source) domText = collapse($(SOURCE_SELECTORS[source]).text());
  if (domText.length < JD_MIN_CHARS) domText = collapse($("main, [role='main'], article").first().text());
  if (domText.length < JD_MIN_CHARS) domText = collapse($("body").text());

  // Prefer the structured JobPosting, then the page text, then any meta description.
  const text =
    jsonLd.length >= JD_MIN_CHARS
      ? jsonLd
      : domText.length >= JD_MIN_CHARS
        ? domText
        : [jsonLd, domText, ogDescription].sort((a, b) => b.length - a.length)[0] ?? "";

  if (text.length < JD_MIN_CHARS) {
    throw new AppError(
      "We couldn't extract enough job content from that URL. Please paste the description instead.",
      422,
    );
  }

  return { text: text.slice(0, 12_000), source: hostname };
}
