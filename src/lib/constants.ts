/** Shared limits and config (PRD: FR-01, FR-02). */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (FR-01)

/** Accepted resume upload types, mapped to a short kind. */
export const ACCEPTED_RESUME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
} as const;

export type ResumeKind =
  (typeof ACCEPTED_RESUME_TYPES)[keyof typeof ACCEPTED_RESUME_TYPES];

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;

export const JD_MIN_CHARS = 100; // FR-02: minimum 100 characters
export const JD_MAX_CHARS = 6000; // matches the "0 / 6000" counter in ui.png

export const COVER_LETTER_MAX_WORDS = 400; // FR-07

export const GEMINI_MODEL = "gemini-3.1-flash-lite"; // PRD: AI stack
