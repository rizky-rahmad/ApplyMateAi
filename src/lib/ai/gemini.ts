import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import {
  analysisCoreSchema,
  type AnalysisCore,
  type AnalyzeInput,
  type RefineInput,
  type TailorInput,
} from "@/lib/schemas";
import {
  ANALYSIS_SYSTEM_INSTRUCTION,
  COVER_LETTER_SYSTEM_INSTRUCTION,
  REFINE_SYSTEM_INSTRUCTION,
  TAILOR_SYSTEM_INSTRUCTION,
  buildAnalysisPrompt,
  buildCoverLetterPrompt,
  buildRefinePrompt,
  buildTailorPrompt,
} from "./prompts";

let client: GoogleGenAI | null = null;

/** Throw a friendly 503 if the server is missing its key (call before streaming). */
export function assertGeminiConfigured(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError("AI is not configured. Set GEMINI_API_KEY to enable generation.", 503);
  }
}

function getClient(): GoogleGenAI {
  assertGeminiConfigured();
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** Pull a Gemini error's HTTP-ish status code and message into a simple shape. */
function geminiError(err: unknown): { code: number | undefined; message: string } {
  const e = err as { status?: number; code?: number; message?: string };
  const code = typeof e?.status === "number" ? e.status : e?.code;
  return { code, message: String(e?.message ?? "") };
}

/**
 * A hard quota cap -- e.g. the free tier's daily request limit -- as opposed to the
 * transient per-minute spike the PRD wants retried. Retrying within the request won't
 * clear a daily cap, so we fail fast with an actionable message instead.
 */
function isQuotaExceeded(err: unknown): boolean {
  const { code, message } = geminiError(err);
  if (code !== 429) return false;
  return /exceeded your current quota|per ?day|free_tier|RequestsPerDay/i.test(message);
}

const QUOTA_MESSAGE =
  "Gemini API quota exceeded: you've hit the free tier's request limit for this model. " +
  "Wait for the daily quota to reset, enable billing on your Google AI Studio project, " +
  "or switch GEMINI_MODEL to a model with remaining quota.";

/** Gemini occasionally returns transient 429/500/503 ("high demand"). */
function isTransient(err: unknown): boolean {
  const { code, message } = geminiError(err);
  if (code === 429 || code === 500 || code === 503) return true;
  return /unavailable|high demand|overloaded|temporar|rate limit/i.test(message);
}

/** Run an async call, retrying transient Gemini errors with a short backoff. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // A hard quota cap won't clear by retrying -- surface a clear, actionable error now.
      if (isQuotaExceeded(err)) throw new AppError(QUOTA_MESSAGE, 429);
      if (!isTransient(err) || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)));
    }
  }
  throw lastError;
}

// Structured-output schema mirrored from analysisCoreSchema (lib/schemas.ts).
const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: { type: Type.INTEGER },
    matchLabel: { type: Type.STRING },
    matchSummary: { type: Type.STRING },
    topPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "matchScore",
    "matchLabel",
    "matchSummary",
    "topPriorities",
    "matchingSkills",
    "missingSkills",
    "concerns",
  ],
  propertyOrdering: [
    "matchScore",
    "matchLabel",
    "matchSummary",
    "topPriorities",
    "matchingSkills",
    "missingSkills",
    "concerns",
  ],
};

/** Stage A: structured match analysis (FR-04..FR-06). Retries on transient + malformed JSON. */
export async function generateAnalysisCore(input: AnalyzeInput): Promise<AnalysisCore> {
  const ai = getClient();
  const prompt = buildAnalysisPrompt(input);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: analysisResponseSchema,
            temperature: 0.5,
          },
        }),
      );
      const raw = response.text;
      if (!raw) throw new Error("Empty response from model.");
      return analysisCoreSchema.parse(JSON.parse(raw));
    } catch (err) {
      lastError = err;
      if (err instanceof AppError) throw err;
    }
  }

  console.error("Gemini analysis failed:", lastError);
  throw new AppError("The AI couldn't complete the analysis. Please try again.", 502);
}

/** Stage B: stream the cover letter as plain-text chunks (FR-07/FR-08). */
export async function* streamCoverLetter(input: AnalyzeInput): AsyncGenerator<string, void, unknown> {
  const ai = getClient();
  const response = await withRetry(() =>
    ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: buildCoverLetterPrompt(input),
      config: {
        systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
        temperature: input.regenerate ? 0.95 : 0.7,
      },
    }),
  );

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}

/** Rewrite the current cover letter per a quick action, streaming plain-text chunks (FR-07). */
export async function* streamRefine(input: RefineInput): AsyncGenerator<string, void, unknown> {
  const ai = getClient();
  const response = await withRetry(() =>
    ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: buildRefinePrompt(input.letter, input.action),
      config: {
        systemInstruction: REFINE_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    }),
  );

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}

/** Rewrite the letter to emphasize a matched skill or honestly address a missing one (FR-07). */
export async function* streamTailor(input: TailorInput): AsyncGenerator<string, void, unknown> {
  const ai = getClient();
  const response = await withRetry(() =>
    ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: buildTailorPrompt(input.letter, input.resumeText, input.skill, input.mode),
      config: {
        systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    }),
  );

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}
