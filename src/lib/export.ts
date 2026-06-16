import type { AnalysisCore } from "@/lib/schemas";

/** Copy plain text to the clipboard (FR-09). */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download text as a .txt file. */
export function downloadTextFile(filename: string, text: string): void {
  triggerDownload(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

/** Download text as a .docx file (docx is imported lazily). */
export async function downloadDocxFile(filename: string, text: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const paragraphs = text
    .split(/\n{2,}/)
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      return new Paragraph({
        spacing: { after: 200 },
        children: lines.map(
          (line, i) => new TextRun({ text: line, break: i === 0 ? undefined : 1 }),
        ),
      });
    });

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}

/** Build a combined plain-text report of the analysis + cover letter ("Download all"). */
export function buildReport(result: AnalysisCore, coverLetter: string): string {
  const section = (title: string, body: string) => `${title}\n${"-".repeat(title.length)}\n${body}`;
  return [
    "ApplyMate AI - Analysis Report",
    "==============================",
    "",
    section(
      "Match score",
      `${result.matchScore}% - ${result.matchLabel}\n${result.matchSummary}`,
    ),
    "",
    section("Top priorities", result.topPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")),
    "",
    section("Matching skills", result.matchingSkills.join(", ") || "None"),
    "",
    section("Missing / weak skills", result.missingSkills.join(", ") || "None"),
    "",
    result.concerns.length ? section("Potential concerns", result.concerns.map((c) => `- ${c}`).join("\n")) + "\n" : "",
    section("Tailored cover letter", coverLetter),
    "",
  ].join("\n");
}
