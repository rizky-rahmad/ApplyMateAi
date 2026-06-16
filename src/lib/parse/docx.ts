import "server-only";
import mammoth from "mammoth";
import { AppError } from "@/lib/errors";

export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    throw new AppError("We couldn't read that DOCX file. Please try another file.", 422);
  }
}
