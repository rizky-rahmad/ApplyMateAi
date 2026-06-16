# ApplyMate AI

Generate a personalized, job-specific cover letter from your resume and a target job
posting — plus a match analysis — in under a minute. Built with Next.js 15 and Google
Gemini, with a **streaming** cover-letter writer and in-editor **AI editing**.

Upload a resume (PDF/DOCX), paste a job description or a job URL, and ApplyMate AI returns:

- **Match score** (0–100) with a semantic color ring and a "why not higher" breakdown
- **Top priorities** the employer cares about
- **Matching skills** — click one to emphasize it in your letter
- **Missing / weak skills** — click one to address it honestly (never fabricated)
- A **tailored cover letter** that streams in as it is written, then becomes editable

In the editor you can **Regenerate**, **Refine** (more concise / more formal / shorten to
~250 words / fix grammar), edit by hand, copy, or download as TXT/DOCX. No accounts, no
database — files and text are processed in memory per request and never stored on a server.

---

## Tech stack

| Layer        | Choice                                                        |
|--------------|--------------------------------------------------------------|
| Framework    | Next.js 15 (App Router) + React 19, TypeScript               |
| Styling      | Tailwind CSS v4 + shadcn/ui (Base UI)                         |
| AI           | Google Gemini via `@google/genai` (default `gemini-2.5-flash`); analysis is structured JSON, the letter + edits stream |
| Parsing      | `pdf-parse` (PDF), `mammoth` (DOCX)                           |
| Scraping     | `cheerio` (+ schema.org JobPosting JSON-LD / og:description) |
| Editor       | Tiptap (rich-text cover-letter editor)                       |
| Validation   | `zod`                                                        |
| Deployment   | Vercel                                                       |

---

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (tested on Node 22)
- A Google Gemini API key — create one at <https://aistudio.google.com/apikey>

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

```ini
# .env.local
GEMINI_API_KEY=your_key_here
```

`.env.local` is git-ignored. The UI renders without a key, but generation needs it.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. (If port 3000 is busy, Next picks the next free port.) No
resume handy? Click **"Try with a sample"** to load an example and auto-generate.

---

## Scripts

| Command            | Description                                  |
|--------------------|----------------------------------------------|
| `npm run dev`      | Start the dev server                         |
| `npm run build`    | Production build                             |
| `npm run start`    | Serve the production build                   |
| `npm run lint`     | Run ESLint                                   |
| `npx tsc --noEmit` | Type-check                                   |

## Choosing the model

The Gemini model id lives in one place — `GEMINI_MODEL` in
[`src/lib/constants.ts`](src/lib/constants.ts). It defaults to `gemini-2.5-flash` (fast and
economical); switch it to `gemini-2.5-pro` for deeper analysis.

---

## How it works

```
Resume (PDF/DOCX) ──► /api/parse-resume ──► resume text
Job description ────────────────────────► job text
   or Job URL ──────► /api/scrape-job ────► job text (JSON-LD / og:description / DOM)

Generate ──► /api/analyze       ──► match analysis  (cards render immediately)
         └─► /api/cover-letter  ──► cover letter STREAMS in, then becomes editable

In the editor:  Regenerate · Refine (/api/refine) · click a skill → Tailor (/api/tailor)
```

All parsing, scraping, and AI calls run server-side in Node-runtime route handlers, so the
Gemini key is never exposed to the browser. The analysis is a single structured-JSON call
(validated with `zod`); the cover letter and every edit stream back as plain text. Transient
Gemini errors (high-demand 429/500/503) are retried automatically with backoff.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Single-page UI (sidebar inputs + streamed results)
│   ├── layout.tsx            # Fonts, theme provider, toaster
│   ├── globals.css           # Design tokens + Tailwind
│   └── api/                  # parse-resume · scrape-job · analyze · cover-letter · refine · tailor
├── components/               # header/footer, input, analysis cards, cover-letter editor
└── lib/                      # ai (Gemini + prompts), parse, scrape, schemas, export, utils
```

See [`CLAUDE.md`](CLAUDE.md) for the full architecture and contributor guidelines, and
[`requierements.md`](requierements.md) for the original product requirements.

---

## Deployment

Deploy to Vercel:

1. Push the repo to GitHub and import it in Vercel.
2. Add `GEMINI_API_KEY` in the Vercel project's environment variables.
3. Deploy.

> Note: serverless request bodies are capped (~4.5 MB on Vercel), below the app's 10 MB
> upload limit. For very large resumes, host on a platform without that cap or add chunked
> upload handling.

---

## Privacy

No authentication, no database, no server-side persistence. Resumes and job text are sent to
Google Gemini using your API key and processed in memory to fulfill a single request. Your
current working session (inputs + result) is kept only in the browser's `sessionStorage` —
ephemeral, and cleared when the tab closes.
