# CLAUDE.md — ApplyMate AI

Guidance for Claude Code (and any contributor) working in this repository.
This file is the **source of truth for how to build ApplyMate AI**. It is derived
directly from [`requierements.md`](./requierements.md) (the PRD) and
[`ui.png`](./ui.png) (the target UI). **Do not deviate from either.** Where this
file and the PRD disagree, the PRD wins — update this file instead of drifting.

> Status: **Built, extended, and verified end-to-end.** The app builds (`npm run build`),
> type-checks (`npx tsc --noEmit`), lints clean, and runs (`npm run dev`); live Gemini calls work.
> Beyond the PRD-faithful base it now does **streaming generation** and **in-editor AI editing**
> (refine / tailor) — see **§14**. Add `GEMINI_API_KEY` to `.env.local` to enable AI; the rest of
> the UI works without it.
>
> **Key implementation facts** (these override the generic notes below):
> - **Next.js 15.5.19** — pinned to 15 per PRD. `create-next-app@latest` now installs Next 16; do not upgrade.
> - **Tailwind v4** + **shadcn/ui "base-nova" style**, built on **Base UI** (`@base-ui/react`), not Radix.
> - **lucide-react v1** — import icons with the `Icon` suffix (e.g. `SparklesIcon`, `Loader2Icon`).
> - **pdf-parse v2** — class API `new PDFParse({ data }).getText()`. No v1 `lib/pdf-parse.js` workaround, no `@types/pdf-parse`.
> - **Vercel bundling (`next.config.ts`)** — `pdf-parse` -> `pdfjs-dist` loads `@napi-rs/canvas` and `pdf.worker.mjs` through dynamic requires that `@vercel/nft` can't trace, so both must be force-included for `/api/parse-resume` via `outputFileTracingIncludes` (alongside `serverExternalPackages`). Do **not** remove these: without them prod `/api/parse-resume` 500s at module load on `DOMMatrix is not defined`, then 422s on a missing fake worker. It still works locally either way, so this only shows up after deploy.
> - **Tiptap v2** editor: `StarterKit` + `@tiptap/extension-underline` + `@tiptap/extension-link`.
> - **next-themes** drives light/dark (default **light**); the sonner `Toaster` reads it.
> - **Gemini** via `@google/genai`; model `GEMINI_MODEL` in `src/lib/constants.ts` — currently **`gemini-2.5-flash`** (PRD: `gemini-2.5-pro`). Analysis is one structured-output call; the cover letter and all edits **stream** as plain text. Every call retries transient 429/500/503 with backoff (`withRetry`). Validated with zod.
> - Design tokens (violet `#5B3FE0` on lavender `#F7F7FD`) live in `src/app/globals.css`, sampled from `ui.png`.
> - Keep source **ASCII-only** in regexes/JSX text (ESLint `no-irregular-whitespace`; escape JSX apostrophes as `&apos;`).

---

## 1. Product summary

**ApplyMate AI** is a single-page web app that generates a personalized cover letter
from a user's resume + a target job posting, plus a job-match analysis.

Core value: turn the 15–30 min manual cover-letter task into **< 1 minute**.

Pipeline (one user action → full result):

```
Resume (PDF/DOCX) + Job (pasted text OR URL)
        ↓  Generate analysis
Resume analysis → Job analysis → Match score → Cover letter
        ↓
Render: Match score, Top priorities, Matching skills, Missing/weak skills, Cover letter
```

Hard product constraints (from PRD):
- **No auth, no accounts, no database.** Nothing is persisted. Files/text are processed
  in-memory per request and discarded.
- Cover letter must be **< 400 words**, professional, specific (no generic filler),
  reference the candidate's real experience, and align to the job.
- AI generation budget **< 30 s**; first page load **< 3 s**.
- Keyboard accessible; responsive desktop + mobile.

---

## 2. Tech stack (locked by PRD)

| Layer        | Choice                                             |
|--------------|----------------------------------------------------|
| Framework    | **Next.js 15** (App Router) + **React 19**         |
| Language     | **TypeScript** (strict)                            |
| Styling      | **Tailwind CSS v4** + **shadcn/ui** (Base UI)      |
| AI           | **Gemini** via `@google/genai` — model in `GEMINI_MODEL` (currently `gemini-2.5-flash`; PRD: `gemini-2.5-pro`) |
| PDF parsing  | **pdf-parse** (v2)                                 |
| DOCX parsing | **mammoth**                                        |
| Scraping     | **Cheerio**                                        |
| Deployment   | **Vercel**                                         |

**UI-driven additions** (not in PRD, but required to match `ui.png` — keep minimal):
- **Tiptap** (`@tiptap/react`, `StarterKit`, `Underline`, `Link`) — the cover-letter
  rich-text editor with the toolbar shown in the mockup. Do not swap for a heavier editor.
- **docx** — generate the "Download as DOCX" file client-side (lazy-imported). TXT download is a plain `Blob`.
- **zod** — validate API inputs and constrain/parse Gemini's structured output.
- **next-themes** — light/dark theming (default light); required because the shadcn `Toaster` reads it.

Do not add state libraries, ORMs, auth, or analytics. Keep the dependency surface small.

> **Note on the AI provider.** The provider is **Gemini** (`@google/genai`) and stays fixed —
> all model access is isolated behind `src/lib/ai/gemini.ts`. The *model id* is configurable in
> one place (`GEMINI_MODEL`, `src/lib/constants.ts`); it currently runs `gemini-2.5-flash`
> (faster/cheaper) while the PRD specified `gemini-2.5-pro`. Switching back is a one-line change.
> Do not change the provider unless the PRD changes.

---

## 3. Commands

Already scaffolded and installed. Day-to-day:

```bash
npm run dev        # dev server (http://localhost:3000; falls back to the next free port)
npm run build      # production build — must pass before deploy
npm run start      # serve the production build
npm run lint       # ESLint — keep clean
npx tsc --noEmit   # type-check (run before committing)
```

After any change, the bar to call it "done": **`npm run lint` clean, `npx tsc --noEmit`
clean, `npm run build` succeeds.** Never claim a feature works without building it.

<details>
<summary>How it was bootstrapped (historical)</summary>

```bash
npx create-next-app@15 . --ts --tailwind --app --eslint --src-dir --import-alias "@/*"
npx shadcn@latest init -d            # resolves to the "base-nova" style (Base UI based)
npx shadcn@latest add button card tabs textarea input badge dropdown-menu progress sonner
npm install @google/genai pdf-parse mammoth cheerio zod \
  @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link \
  docx next-themes
```
</details>

---

## 4. Architecture & directory layout

Single page (`/`) with a left **input sidebar** and a right **results area**. All heavy
lifting happens in **Node-runtime API routes** (parsing, scraping, and AI calls cannot run
on the Edge runtime).

```
src/
├── app/
│   ├── layout.tsx                 # Root layout: Inter font, ThemeProvider, <Toaster/>, metadata
│   ├── page.tsx                   # Single page: orchestrates state, sidebar + results + footer
│   ├── globals.css                # Tailwind v4 + design tokens (see §7) + .tiptap styles
│   └── api/                       # all Node runtime
│       ├── parse-resume/route.ts  # POST multipart -> { text, filename, sizeBytes }
│       ├── scrape-job/route.ts    # POST { url } -> job text (JSON-LD/og + DOM)
│       ├── analyze/route.ts       # POST { resumeText, jobText } -> AnalysisCore (no letter)
│       ├── cover-letter/route.ts  # POST { resumeText, jobText, regenerate? } -> STREAMED letter
│       ├── refine/route.ts        # POST { letter, action } -> STREAMED rewrite
│       └── tailor/route.ts        # POST { letter, resumeText, skill, mode } -> STREAMED rewrite
├── components/
│   ├── ui/                        # shadcn/ui primitives (Base UI based, generated)
│   ├── header.tsx                 # Logo + ThemeToggle (dead nav + avatar removed, §14)
│   ├── footer.tsx                 # (c) <year> ApplyMate AI (legal links removed, §14)
│   ├── theme-provider.tsx         # next-themes provider wrapper
│   ├── theme-toggle.tsx           # sun/moon toggle
│   ├── input/
│   │   ├── resume-upload.tsx      # FR-01: drag&drop + chip + extracted-char count/warning/preview
│   │   └── job-input.tsx          # FR-02/03: tabs "Job description" | "Job URL" (+ inline URL error)
│   ├── analysis/
│   │   ├── score-ring.tsx         # SVG ring + scoreTone()/SCORE_LABEL_TEXT (semantic colors)
│   │   ├── match-score-card.tsx   # ring + % + label + summary + "Why not higher" concerns
│   │   ├── top-priorities-card.tsx# numbered recruiter priorities
│   │   ├── matching-skills-card.tsx   # green badges (click -> emphasize) + "N skills match"
│   │   └── missing-skills-card.tsx    # amber badges (click -> address honestly)
│   ├── cover-letter/
│   │   ├── cover-letter-editor.tsx  # Tiptap editor + Refine/Regenerate + word target + actions
│   │   ├── streaming-cover-letter.tsx # read-only view while the letter streams in
│   │   └── editor-toolbar.tsx      # B I U / lists / link / undo / redo (headings + quote removed)
│   └── results/
│       ├── empty-state.tsx        # placeholder + "Try with a sample"
│       └── loading-state.tsx      # skeletons (stage A: analyzing)
└── lib/
    ├── ai/
    │   ├── gemini.ts              # generateAnalysisCore() + streamCoverLetter/Refine/Tailor() + withRetry()
    │   └── prompts.ts             # system instructions + builders (analysis / letter / refine / tailor)
    ├── parse/
    │   ├── index.ts               # extractResumeText(): validate size/type + dispatch
    │   ├── pdf.ts                 # pdf-parse v2 wrapper
    │   └── docx.ts                # mammoth wrapper
    ├── scrape.ts                  # Cheerio + JobPosting JSON-LD + og:description; lenient-parser fallback
    ├── schemas.ts                 # zod: AnalysisCore, AnalysisResult, AnalyzeInput, RefineInput, TailorInput, ScrapeInput
    ├── constants.ts               # limits + GEMINI_MODEL (the model id lives here)
    ├── errors.ts                  # AppError + toErrorResponse()
    ├── export.ts                  # TXT + DOCX builders, copy-to-clipboard, combined report
    └── utils.ts                   # cn(), wordCount(), formatBytes()
```

No `src/types/` directory — shared types come from zod via `lib/schemas.ts`. Keep components
presentational; keep parsing/scraping/AI in `lib/` and call them only from API routes (they
hold the `GEMINI_API_KEY` and must never run in the browser).

---

## 5. Request lifecycle / data flow

State lives in `page.tsx` (plain React state). The working session (inputs + result) is mirrored
to **`sessionStorage`** so a refresh keeps the current result (ephemeral, cleared with the tab).

Generation is **two staged calls** so the cards show fast and the letter streams in:

```
resumeFile -> POST /api/parse-resume -> resumeText  (UI shows extracted-char count + preview)
jobMode = "description" | "url"
  description -> jobText (typed)
  url         -> POST /api/scrape-job -> jobText
Generate -> (A) POST /api/analyze { resumeText, jobText } -> AnalysisCore   => render cards
         -> (B) POST /api/cover-letter { resumeText, jobText } -> STREAM     => letter writes in live
Regenerate  -> POST /api/cover-letter { ..., regenerate:true } -> STREAM     (letter only)
Refine      -> POST /api/refine { letter, action } -> STREAM                 (concise/formal/shorten/grammar)
Click skill -> POST /api/tailor { letter, resumeText, skill, mode } -> STREAM (emphasize / address)
Copy / Download TXT / DOCX / Download all -> client-side from current state
```

### API contracts

`POST /api/parse-resume` - `multipart/form-data`, field `file`
- PDF/DOCX only; reject others (415), files > 10 MB (413), unreadable (422).
- -> `200 { text, filename, sizeBytes }`

`POST /api/scrape-job` - `{ url }`
- Extract schema.org **JobPosting** JSON-LD + `og:description` before the DOM fallback.
- -> `200 { text, source }` | `422 { error }`

`POST /api/analyze` - `{ resumeText, jobText }` (zod; `jobText` >= 100 chars)
- -> `200 AnalysisCore` (the analysis WITHOUT the cover letter), structured JSON.

`POST /api/cover-letter` - `{ resumeText, jobText, regenerate? }` -> **streamed** `text/plain` letter.
`POST /api/refine` - `{ letter, action: "concise"|"formal"|"shorten"|"grammar" }` -> **streamed** rewrite.
`POST /api/tailor` - `{ letter, resumeText, skill, mode: "emphasize"|"address" }` -> **streamed** rewrite,
grounded in the resume (never fabricates for `address`).

The three streaming routes return a `ReadableStream`; pre-stream errors come back as `4xx/5xx { error }`
JSON (e.g. 503 if `GEMINI_API_KEY` is missing). All routes are Node runtime.

### Types (zod in `lib/schemas.ts`)

```ts
type AnalysisCore = {            // /api/analyze response + the rendered cards
  matchScore: number;            // 0-100
  matchLabel: string;            // e.g. "Strong match"
  matchSummary: string;          // one-line verdict under the ring
  topPriorities: string[];       // recruiter priorities, ordered
  matchingSkills: string[];      // present in resume AND wanted by the job
  missingSkills: string[];       // wanted but not evidenced
  concerns: string[];            // "why not higher" gaps
};
type AnalysisResult = AnalysisCore & { coverLetter: string }; // used by the combined report
```

---

## 6. AI layer (Gemini)

- SDK **`@google/genai`**; model id in `GEMINI_MODEL` (`src/lib/constants.ts`), currently
  **`gemini-2.5-flash`** (PRD: `gemini-2.5-pro`). Key from `GEMINI_API_KEY` (server-only) -- never
  expose it or call Gemini from the client.
- `src/lib/ai/gemini.ts` exposes:
  - **`generateAnalysisCore(input)`** -- one structured-output call (`responseMimeType:"application/json"`
    + `responseSchema`), validated with zod; retries once on malformed JSON. (FR-04/05/06.)
  - **`streamCoverLetter(input)`** -- async generator yielding the letter as plain-text chunks. (FR-07/08.)
  - **`streamRefine(input)`** -- rewrite the current letter per a quick action. (FR-07.)
  - **`streamTailor(input)`** -- rewrite to emphasize a matched skill or honestly address a missing one,
    grounded in the resume. (FR-06/07.)
  - **`withRetry()`** wraps every call and retries transient **429/500/503** ("high demand") with backoff.
  - **`assertGeminiConfigured()`** -- throws a 503 the routes surface before streaming.
- Prompts (`src/lib/ai/prompts.ts`): separate system instructions + builders for analysis, cover
  letter, refine, and tailor. Letter/refine/tailor output **plain text only** (no JSON or markdown).
- **Regenerate** re-streams only the letter (higher temperature); the match score & skills stay stable.
- **Grounding rule:** never invent employers, titles, skills, or experience absent from the resume --
  the `address` tailor mode must acknowledge a gap honestly, not fake proficiency.

---

## 7. Design system (must match `ui.png`)

Light, airy, lavender-tinted. Vivid violet/indigo primary. Generously rounded white cards
with soft borders (a subtle ring, not heavy shadows). Sampled from `ui.png`:

| Token                    | Value          | Usage                                            |
|--------------------------|----------------|--------------------------------------------------|
| `--background`           | `#F7F7FD`      | App background (very light lavender-gray)        |
| `--card`                 | `#FFFFFF`      | Cards, sidebar, header surfaces                  |
| `--foreground`           | `#1E1B33`      | Headings / primary text (dark indigo-navy)       |
| `--muted-foreground`     | `#6B6B80`      | Subtitles, helper text, placeholders             |
| `--border`               | `#E8E8F1`      | Card borders, dividers, dashed dropzone          |
| `--primary`              | `#5B3FE0`      | Buttons, links, active tab, ring, step circles, "AI" |
| `--primary-foreground`   | `#FFFFFF`      | Text on primary                                  |
| matching badge           | `bg-emerald-50` / `text-emerald-700` | "Matching skills" pills            |
| missing badge            | `bg-orange-50` / `text-orange-700`   | "Missing / weak skills" pills      |
| radius                   | `0.75rem` base; cards `rounded-xl/2xl`, inputs `rounded-lg/xl`, pills `rounded-full` |

- **Font:** Inter (via `next/font/google`, bound to `--font-sans`), with system fallback.
  Headings semibold/bold in `--foreground`; body normal weight.
- **Primary button** ("Generate analysis", "Copy to clipboard"): solid `--primary`, white
  text, full-width in the sidebar, sparkle/icon leading where shown.
- **Secondary/outline buttons** ("New analysis", "Download all", "Regenerate", "Download as
  TXT/DOCX"): white bg, `--border`, `--foreground` text, leading icon.
- Tokens are wired into shadcn CSS variables in `globals.css`; dark-mode values live in `.dark`.

---

## 8. Page layout (exact, from `ui.png`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ HEADER: ✦ ApplyMate AI        How it works   Tips   ☀(theme)   ◔(avatar)  │
├───────────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR (~360px, sticky)        │ MAIN (flex-1)                            │
│                                 │ "Your analysis"                          │
│ ① Upload resume                 │ "Here's your personalized analysis…"     │
│   PDF or DOCX (max 10MB)        │              [New analysis] [Download all]│
│   ┌───── dashed dropzone ─────┐ │ ┌─────────┬──────────┬─────────┬────────┐│
│   │ ☁ Drag & drop your file   │ │ │ Match   │ Top      │ Matching│ Missing/││
│   │     or  [Choose file]     │ │ │ score   │ priorities│ skills │ weak    ││
│   └───────────────────────────┘ │ │ ◷ 84%   │ 1..5 list │ green  │ amber   ││
│   📄 John_Doe_Resume.pdf 245KB✓ │ │ Strong  │           │ badges │ badges  ││
│                                 │ │ match   │           │ +count │ +helper ││
│ ② Add job description           │ └─────────┴──────────┴─────────┴────────┘│
│   [Job description] [ Job URL ] │ "Your tailored cover letter"  [Regenerate]│
│   ┌ textarea  … 0 / 6000 ┐      │ ┌ Normal▾  B I U  • 1. ⇥  🔗  ↶ ↷ ──────┐│
│   └───────────────────────┘     │ │ Dear Hiring Manager, …                ││
│   [ ✦ Generate analysis ]       │ │ …(editable letter body)…              ││
│   🛡 Your data is processed      │ └───────────────────────────────────────┘│
│      securely and not stored.   │ [Copy to clipboard][Download TXT][DOCX]  │
├───────────────┴──────────────────────────────────────────────────────────┤
│ FOOTER: © 2024 ApplyMate AI         Privacy Policy   Terms of Service  Contact│
└──────────────────────────────────────────────────────────────────────────┘
```

Exact copy/details to reproduce:
- **Header:** logo "ApplyMate" (foreground) + "AI" (primary), nav links "How it works",
  "Tips", a theme toggle (sun) icon button, and a circular avatar icon button.
- **Sidebar steps** use numbered circles ①/② in primary.
  - **Upload:** label "Upload resume", sub "PDF or DOCX (max 10MB)"; dashed dropzone with
    cloud icon, "Drag & drop your file here", "or", "Choose file" (primary link). After
    upload: red file icon + filename + size (e.g. "245 KB") + green check + remove.
  - **Job:** label "Add job description"; tabs **Job description** (active) | **Job URL**;
    textarea placeholder "Paste the job description here…" with a **`0 / 6000`** char counter.
  - **Generate analysis** primary button with sparkle icon; below it, shield icon +
    "Your data is processed securely and not stored permanently."
- **Main header row:** H1 "Your analysis"; subtitle "Here's your personalized analysis and
  cover letter"; right-aligned "New analysis" (outline) + "Download all" (outline, download icon).
- **Four cards** (responsive: 4-up desktop → 2-up → stack on mobile):
  1. **Match score** — circular ring, big "84%", "Strong match" (primary), one-line summary.
  2. **Top priorities** — numbered list (1–5) of recruiter priorities.
  3. **Matching skills** — green badges + "N skills match".
  4. **Missing / weak skills** — amber badges + the nice-to-have helper text.
- **Cover letter:** H2 "Your tailored cover letter" + "Regenerate" (outline, refresh icon);
  Tiptap toolbar (Normal ▾, B, I, U, bullet list, ordered list, quote, link, undo, redo);
  editable body; action row "Copy to clipboard" (primary, copy icon), "Download as TXT"
  (outline), "Download as DOCX" (outline).
- **Footer:** "© 2024 ApplyMate AI" left; "Privacy Policy", "Terms of Service", "Contact" right.

> The mockup shows the **results/loaded** state. The app also implements the **initial/empty**
> state (placeholder card until the first analysis) and the **loading** state (skeletons during
> generation). The mockup's sample data (84%, John Doe letter) is **placeholder** — real
> content comes from Gemini.
>
> **The shipped app intentionally deviates from this mockup** (streaming letter, 2x2 card grid,
> trimmed toolbar, no header nav/avatar, no footer legal links, no privacy note). These were
> explicit product decisions — see **§14**.

---

## 9. Functional requirements traceability

| FR    | Requirement              | Where it lives                                           |
|-------|--------------------------|----------------------------------------------------------|
| FR-01 | Resume upload (PDF/DOCX) | `resume-upload.tsx` → `/api/parse-resume` → `lib/parse/*` |
| FR-02 | Paste job description    | `job-input.tsx` (≥ 100 chars, multi-line, `0/6000`)      |
| FR-03 | Job URL                  | `job-input.tsx` → `/api/scrape-job` → `lib/scrape.ts`    |
| FR-04 | Resume analysis          | `lib/ai/prompts.ts` (folded into `/api/analyze`)         |
| FR-05 | Job analysis             | `lib/ai/prompts.ts` → `topPriorities`                    |
| FR-06 | Match analysis           | `match-score-card`, `matching-skills-card`, `missing-skills-card` |
| FR-07 | Cover letter generation  | `cover-letter-editor.tsx` (< 400 words, editable)        |
| FR-08 | Regenerate cover letter  | "Regenerate" -> streamed `/api/cover-letter { regenerate:true }` (letter only) |
| FR-09 | Copy output              | "Copy to clipboard" + success toast (sonner)             |

> Beyond the FRs, the app adds in-editor **Refine** (`/api/refine`) and **Tailor** (`/api/tailor`)
> AI editing, and streams the cover letter as it is written (see §14).

---

## 10. Non-functional requirements & guardrails

- **Performance:** first load < 3 s (keep parsing/scraping/AI server-side; `docx` lazy-loaded);
  generation < 30 s (single Gemini call; show loading state).
- **Reliability / error handling (do this everywhere):**
  - Invalid/oversized/unsupported upload → clear inline error, no crash.
  - Scrape failure (LinkedIn etc. is best-effort) → meaningful message, suggest paste instead.
    Servers that send malformed HTTP headers (rejected by undici `fetch`) are retried with
    Node's lenient HTTP parser (`insecureHTTPParser`) — see `lib/scrape.ts`.
  - AI 429/500/503/timeout/malformed JSON → graceful error, auto-retried with backoff (`withRetry`);
    a failed stream restores the previous letter. Never a blank screen.
- **Security/privacy:** no auth, no DB, **no persistence**. Process files/text in-memory and
  discard. `GEMINI_API_KEY` is server-only. Surface the "processed securely, not stored" note.
- **Accessibility:** full keyboard support, labelled inputs, visible focus, the editor and
  buttons reachable via keyboard, sufficient contrast.
- **Responsive:** the 4 cards and 2-column layout collapse cleanly to a single column on mobile.

---

## 11. Environment variables

```
GEMINI_API_KEY=          # required — Google AI Studio / Gemini API key (server-only)
```

Put real values in `.env.local` (git-ignored). A committed `.env.example` documents the key
name. Set `GEMINI_API_KEY` in Vercel project settings for deploys. The model id is **not** an
env var — it lives in `GEMINI_MODEL` (`src/lib/constants.ts`).

---

## 12. Out of scope (do NOT build)

User accounts · resume builder · job-application tracking · interview prep · ATS optimization
· payments · resume storage/history · multi-language. (Straight from the PRD — resist scope creep.)

---

## 13. Conventions & "jangan meleset" rules

1. **PRD + `ui.png` are binding.** Match the layout, copy, colors, and flow above. If you must
   deviate, say so explicitly and explain why.
2. **TypeScript strict; no `any`.** Share types via `lib/schemas.ts` (zod).
3. Parsing, scraping, and AI calls run **only in Node-runtime API routes** — never client-side.
   Mark those routes `export const runtime = "nodejs"`.
4. Keep components presentational; business logic in `lib/`.
5. Validate every API boundary with zod; never trust client input or model output.
6. Small dependency surface — only the libraries listed in §2.
7. Don't persist user data anywhere. No logging of resume/job content.
8. Definition of done: matches the mockup, `lint` + `tsc --noEmit` + `build` all clean,
   and the happy path (upload → paste/URL → generate → render → copy/download) works end-to-end.
9. Update **this file** when decisions change — keep it the accurate source of truth.

---

## 14. Post-PRD enhancements (implemented, by user request)

Built on top of the PRD-faithful base, in priority order. All verified live against Gemini.

**AI / generation**
- **Streaming generation** — `/api/analyze` (cards) then a streamed `/api/cover-letter`; the letter
  writes in live via `streaming-cover-letter.tsx`, then becomes the editable Tiptap editor.
- **Regenerate** re-streams the letter only (score/skills unchanged); confirms first if you edited it.
- **Refine** (editor dropdown) — More concise / More formal / Shorten to ~250 words / Fix grammar.
- **Tailor** — click a matching skill to **emphasize** it, or a missing skill to **address** it honestly.
- **Retry + backoff** on transient Gemini 429/500/503 (`withRetry`).

**Trust & transparency**
- Match-score **semantic ring color** (emerald / amber / rose by band) + matching label color.
- **"Why not higher"** concerns on the score card; **"review before sending"** nudge by the letter.
- Removed the privacy claim, footer legal links (Privacy/Terms/Contact), and header nav + avatar
  (they implied accounts/pages that do not exist).

**Input resilience**
- Resume **extracted-char count + low-text warning + preview**.
- Scraper reads schema.org **JobPosting** JSON-LD + `og:description`; failures show an inline URL error.

**UX polish**
- Word-count **progress toward 400**; toolbar trimmed to cover-letter-relevant controls.
- Analysis cards rebalanced to a **2x2 grid**; mobile **"Edit inputs"** shortcut.
- **"Try with a sample"** loads an example resume + JD and auto-generates.
- **sessionStorage** restore so a refresh keeps the result. Disabled-Generate **hint**.
```
