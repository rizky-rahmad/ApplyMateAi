import "server-only";
import { PDFParse } from "pdf-parse";
import { AppError } from "@/lib/errors";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const { text } = await parser.getText({ pageJoiner: "" }); // no "-- page x of y --" markers
    return text
      .replace(/[ \t]+\n/g, "\n") // strip trailing whitespace on lines
      .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
      .trim();
  } catch (err) {
    // Surface the real cause server-side (error metadata only -- never resume content)
    // so PDF failures are diagnosable instead of collapsing into one generic message.
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[parse-resume] PDF parse failed: ${name}: ${message}`);

    // pdf.js error names (pdfjs-dist v5): map the common ones to an actionable message.
    if (name === "PasswordException") {
      throw new AppError(
        "This PDF is password-protected. Remove the password (re-save or print to a new PDF) and try again.",
        422,
      );
    }
    if (name === "InvalidPDFException") {
      throw new AppError(
        "This file isn't a readable PDF -- it may be corrupted or incomplete. Try re-exporting it, or upload a DOCX.",
        422,
      );
    }
    throw new AppError("We couldn't read that PDF. Please try another file or upload a DOCX.", 422);
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
