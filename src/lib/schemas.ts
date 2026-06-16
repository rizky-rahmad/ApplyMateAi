import { z } from "zod";
import { JD_MAX_CHARS, JD_MIN_CHARS } from "@/lib/constants";

/** The analysis cards (everything except the cover letter). Stage A of generation. */
export const analysisCoreSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchLabel: z.string().min(1),
  matchSummary: z.string().min(1),
  topPriorities: z.array(z.string().min(1)),
  matchingSkills: z.array(z.string().min(1)),
  missingSkills: z.array(z.string().min(1)),
  concerns: z.array(z.string().min(1)),
});

export type AnalysisCore = z.infer<typeof analysisCoreSchema>;

/** Full result (core + the streamed cover letter). Used for the combined report. */
export const analysisResultSchema = analysisCoreSchema.extend({
  coverLetter: z.string().min(1),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/** Input to /api/analyze and /api/cover-letter. */
export const analyzeInputSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required."),
  jobText: z
    .string()
    .trim()
    .min(JD_MIN_CHARS, `Job description must be at least ${JD_MIN_CHARS} characters.`)
    .max(JD_MAX_CHARS, `Job description must be under ${JD_MAX_CHARS} characters.`),
  regenerate: z.boolean().optional(),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

/** Input to /api/refine -- rewrite the current cover letter via a quick action. */
export const refineInputSchema = z.object({
  letter: z.string().min(1, "There is no letter to refine."),
  action: z.enum(["concise", "formal", "shorten", "grammar"]),
});

export type RefineInput = z.infer<typeof refineInputSchema>;
export type RefineAction = RefineInput["action"];

/** Input to /api/tailor -- rewrite the letter to emphasize or honestly address a skill. */
export const tailorInputSchema = z.object({
  letter: z.string().min(1, "There is no letter to tailor."),
  resumeText: z.string().min(1, "Resume text is required."),
  skill: z.string().min(1).max(80),
  mode: z.enum(["emphasize", "address"]),
});

export type TailorInput = z.infer<typeof tailorInputSchema>;
export type TailorMode = TailorInput["mode"];

/** Input to /api/scrape-job. */
export const scrapeInputSchema = z.object({
  url: z.url("Please enter a valid URL."),
});

export type ScrapeInput = z.infer<typeof scrapeInputSchema>;
