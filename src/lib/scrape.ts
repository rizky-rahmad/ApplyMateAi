import "server-only";
import * as cheerio from "cheerio";
import { AppError } from "@/lib/errors";
import { JD_MIN_CHARS } from "@/lib/constants";

const FETCH_TIMEOUT_MS = 12_000;

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
          // description is usually HTML -> strip tags to text.
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

/** Fetch a job posting URL and extract its text content (FR-03). */
export async function scrapeJobPosting(url: string): Promise<{ text: string; source: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new AppError(
        `Couldn't fetch that page (HTTP ${res.status}). Try pasting the description instead.`,
        422,
      );
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppError("That page took too long to load. Try pasting the description instead.", 504);
    }
    throw new AppError("We couldn't reach that URL. Try pasting the description instead.", 422);
  } finally {
    clearTimeout(timeout);
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
