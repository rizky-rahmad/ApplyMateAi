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
  } catch {
    throw new AppError("We couldn't read that PDF. Please try another file.", 422);
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
