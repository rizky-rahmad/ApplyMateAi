import "server-only";
import { ACCEPTED_RESUME_TYPES, MAX_FILE_SIZE, type ResumeKind } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { extractDocxText } from "./docx";
import { extractPdfText } from "./pdf";

function resolveKind(file: File): ResumeKind {
  const byMime = ACCEPTED_RESUME_TYPES[file.type as keyof typeof ACCEPTED_RESUME_TYPES];
  if (byMime) return byMime;
  // Some browsers send an empty/octet-stream type; fall back to the extension.
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  throw new AppError("Unsupported file type. Please upload a PDF or DOCX.", 415);
}

/** Validate an uploaded resume file and extract its text content (FR-01). */
export async function extractResumeText(file: File): Promise<string> {
  if (file.size === 0) throw new AppError("The uploaded file is empty.", 422);
  if (file.size > MAX_FILE_SIZE) throw new AppError("File is too large (max 10MB).", 413);

  const kind = resolveKind(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = kind === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);

  if (text.trim().length < 30) {
    throw new AppError(
      "We couldn't extract readable text from that file. If it's a scanned image, try a text-based resume.",
      422,
    );
  }
  return text;
}
