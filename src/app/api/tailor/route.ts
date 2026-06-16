import { NextResponse } from "next/server";
import { assertGeminiConfigured, streamTailor } from "@/lib/ai/gemini";
import { tailorInputSchema } from "@/lib/schemas";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

// FR-06/FR-07: rewrite the cover letter to emphasize/address a skill, streamed as plain text.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = tailorInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }
    assertGeminiConfigured();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamTailor(parsed.data)) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          console.error("Tailor stream failed:", err);
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const { status, message } = toErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
