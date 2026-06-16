import { NextResponse } from "next/server";
import { scrapeJobPosting } from "@/lib/scrape";
import { scrapeInputSchema } from "@/lib/schemas";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

// FR-03: fetch a job posting URL and return its extracted text.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = scrapeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid URL.", 400);
    }

    const result = await scrapeJobPosting(parsed.data.url);
    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = toErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
