import { NextResponse } from "next/server";
import { generateAnalysisCore } from "@/lib/ai/gemini";
import { analyzeInputSchema } from "@/lib/schemas";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60; // allow up to 60s for the model (NFR: < 30s target)

// FR-04..FR-08: analyze resume vs job and generate the tailored cover letter.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = analyzeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const result = await generateAnalysisCore(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = toErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
