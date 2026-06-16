import { NextResponse } from "next/server";
import { extractResumeText } from "@/lib/parse";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

// FR-01: accept a PDF/DOCX resume upload and return its extracted text.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AppError("No file was uploaded.", 400);
    }

    const text = await extractResumeText(file);

    return NextResponse.json({
      text,
      filename: file.name,
      sizeBytes: file.size,
    });
  } catch (err) {
    const { status, message } = toErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
