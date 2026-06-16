import { COVER_LETTER_MAX_WORDS } from "@/lib/constants";
import type { AnalyzeInput, RefineAction, TailorMode } from "@/lib/schemas";

export const ANALYSIS_SYSTEM_INSTRUCTION = `You are ApplyMate AI, an expert technical recruiter.
You analyze a candidate's resume against a specific job posting and produce a precise, honest, structured assessment.

Rules:
- Ground everything ONLY in the provided resume and job posting. Never invent employers, titles, skills, or experience the candidate did not state.
- Be specific and concrete; avoid vague, generic phrasing.
- Be honest: if the match is weak, say so in the score and concerns.
- Respond with a single valid JSON object matching the requested schema. No markdown, no code fences, no commentary outside the JSON.`;

export const COVER_LETTER_SYSTEM_INSTRUCTION = `You are ApplyMate AI, an expert cover-letter writer.
You write one tailored cover letter grounded strictly in the candidate's resume and aligned to the target job.

Rules:
- Use ONLY facts from the resume. Never invent employers, titles, skills, or experience.
- Be specific and human; avoid generic filler and cliches.
- Keep it professional and UNDER ${COVER_LETTER_MAX_WORDS} words.
- Output ONLY the letter body as plain text: no preamble, no explanations, no markdown, no notes.
- Begin with "Dear Hiring Manager," and end with "Sincerely," on its own line followed by the candidate's name if it appears in the resume.`;

export function buildAnalysisPrompt({ resumeText, jobText }: AnalyzeInput): string {
  return [
    "Analyze the following candidate resume against the target job posting.",
    "",
    "=== RESUME ===",
    resumeText,
    "",
    "=== JOB POSTING ===",
    jobText,
    "",
    "Return JSON with these fields:",
    "- matchScore: integer 0-100 for how well the resume matches the job.",
    "- matchLabel: a 1-3 word verdict, e.g. 'Strong match', 'Good match', 'Partial match', or 'Weak match'.",
    "- matchSummary: one honest, encouraging sentence explaining the score.",
    "- topPriorities: 4-6 short phrases capturing what this employer most wants (recruiter priorities), most important first.",
    "- matchingSkills: skills/technologies present in BOTH the resume and the job posting.",
    "- missingSkills: important skills the job wants that are NOT evidenced in the resume.",
    "- concerns: 0-3 honest potential gaps a recruiter might flag (empty array if none).",
  ].join("\n");
}

export function buildCoverLetterPrompt({ resumeText, jobText, regenerate }: AnalyzeInput): string {
  const lines = [
    "Write a tailored cover letter for this candidate and job.",
    "",
    "=== RESUME ===",
    resumeText,
    "",
    "=== JOB POSTING ===",
    jobText,
    "",
    `Reference the candidate's real experience, align explicitly with the job's requirements, and stay under ${COVER_LETTER_MAX_WORDS} words. Separate paragraphs with a blank line.`,
  ];

  if (regenerate) {
    lines.push(
      "",
      "This is a REGENERATION: produce a noticeably different letter from a typical first draft -- different opening, structure, and emphasis -- while staying accurate to the resume and job.",
    );
  }

  return lines.join("\n");
}

const REFINE_INSTRUCTIONS: Record<RefineAction, string> = {
  concise:
    "Rewrite the cover letter to be more concise and punchy. Remove redundancy and filler while keeping every substantive point.",
  formal: "Rewrite the cover letter in a more formal, polished, professional tone.",
  shorten:
    "Shorten the cover letter to about 250 words, keeping the strongest and most relevant points.",
  grammar:
    "Fix grammar, spelling, and punctuation only. Keep the wording, structure, and meaning otherwise unchanged.",
};

export const REFINE_SYSTEM_INSTRUCTION = `You are an expert editor refining a candidate's cover letter.
Apply the requested change and output ONLY the revised letter as plain text -- no preamble, no notes, no markdown.
Stay grounded in the original letter; never invent new facts, employers, or skills. Keep it under ${COVER_LETTER_MAX_WORDS} words.`;

export function buildRefinePrompt(letter: string, action: RefineAction): string {
  return [REFINE_INSTRUCTIONS[action], "", "=== CURRENT COVER LETTER ===", letter].join("\n");
}

export const TAILOR_SYSTEM_INSTRUCTION = `You are an expert editor tailoring a candidate's cover letter.
Rewrite the letter per the instruction, staying grounded ONLY in the candidate's resume.
Never invent experience, employers, or proficiency the resume does not support.
Output ONLY the revised letter as plain text -- no preamble, no notes, no markdown. Keep it under ${COVER_LETTER_MAX_WORDS} words.`;

export function buildTailorPrompt(
  letter: string,
  resumeText: string,
  skill: string,
  mode: TailorMode,
): string {
  const instruction =
    mode === "emphasize"
      ? `Rewrite the cover letter to more prominently emphasize the candidate's experience with "${skill}", drawing only on facts in the resume. Keep the rest of the letter's substance intact.`
      : `The job values "${skill}", which the resume does not clearly evidence. Rewrite the letter to address this honestly -- for example by expressing genuine eagerness to develop it, or connecting genuinely transferable experience from the resume -- WITHOUT claiming proficiency or inventing experience.`;
  return [
    instruction,
    "",
    "=== RESUME ===",
    resumeText,
    "",
    "=== CURRENT COVER LETTER ===",
    letter,
  ].join("\n");
}
