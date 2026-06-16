# ApplyMate AI

Turn your resume + a target job posting into a **job-match analysis** and a **tailored cover
letter** in under a minute — grounded only in your real experience, never fabricated.

Live demo: _add your Vercel URL here_

---

## What it is, and how to run it

A single-page web app: upload a resume (PDF/DOCX), paste a job description or a job URL, and
ApplyMate AI streams back a match score, the recruiter's likely priorities, your matching and
missing skills, and an editable cover letter you can refine, copy, or download.

```bash
npm install
cp .env.example .env.local      # then set GEMINI_API_KEY (https://aistudio.google.com/apikey)
npm run dev                      # http://localhost:3000
```

No resume handy? Click **"Try with a sample"** to load an example and auto-generate.

## Who it's for, and the one job it has to do well

For job seekers who apply to many roles — software developers, designers, PMs, marketers,
fresh grads, career switchers. **The one job:** produce a specific, honest, ready-to-send cover
letter grounded in *your* resume and *this* job — fast — so you actually tailor each application
instead of sending the same generic letter.

## Why this problem, and how I know it's worth solving

Most applicants reuse one generic letter (or paste raw ChatGPT output) across every role: weak
personalization, poor alignment, fewer callbacks. Doing it properly by hand takes 15–30 minutes
per application, so people skip it. The pain is real and *repeated on every single application*.
My confidence here is from common, well-documented job-seeker behaviour and from being a target
user myself — not formal research. Validating that with real users is the first thing I'd do next
(see the questions below).

## What's already out there, and why I built this anyway

- **Generic LLM chat (ChatGPT/Gemini):** flexible, but you re-prompt every time, it happily
  invents experience, and there's no structure or match analysis.
- **Paid tools (Teal, Rezi, Kickresume, etc.):** capable, but gated behind sign-up/paywalls and
  often still generic.

ApplyMate is a **focused, no-login, single-action** tool that (1) is strictly **grounded in your
resume** — it won't claim skills you don't have, and honestly *addresses* gaps instead of faking
them — and (2) pairs the letter with a **transparent match analysis** so you understand the fit.

## What's in scope, what's left out, and why

**In:** resume upload (PDF/DOCX), paste JD or fetch a job URL, match analysis (score / priorities
/ matching+missing skills / concerns), streamed cover letter, in-editor **AI Refine** (concise /
formal / shorten / fix grammar) and **click-a-skill Tailor**, copy + TXT/DOCX download.

**Out (deliberately, for a ~1-day scope):** accounts, a database / saved history, a resume
builder, application tracking, ATS optimization, payments, multi-language. Nothing is persisted
server-side — the working session lives only in the browser. Kept small so the core loop works
well rather than spreading thin.

## Where I didn't have answers, what I assumed

- Users already have a resume and a specific job in mind.
- The job posting contains enough detail to analyze.
- Gemini can extract meaningful signal from plain resume text.
- "No login + nothing stored" is acceptable — privacy over the convenience of saved history.
- Resumes are small (a few hundred KB), so the upload size limit rarely bites.

## Three questions I'd ask a real user before building more

1. After generating, did you send it mostly as-is or rewrite it — and which parts felt wrong?
2. Do you trust the match score enough to *act* on it (e.g. decide whether to apply)? What would
   make you trust it more?
3. Would you want past resumes/letters saved across sessions, or is "nothing stored" a feature
   for you?

## How I'd know it's working, and what I'd do next

**Working =** a high generate → copy/download rate, a low *immediate* regenerate rate (the first
draft is good enough), and users editing only a small fraction of the letter. **Next:** more
reliable URL import (headless fetch for JS-only sites), pick tone/length up front, generate a few
variants to compare, and optional opt-in history.

---

## How I used AI

This was built almost entirely with an AI coding agent (Claude Code). It did the scaffolding, the
two-stage streaming pipeline, the Gemini integration and prompts, the full UI, and most debugging
— I directed the product decisions, reviewed every change, and verified features by driving the
running app.

**One place it got something wrong that I caught:** it first wrote `pdf-parse` code for the **v1**
API (the old `pdf-parse/lib/pdf-parse.js` debug-file workaround), but the installed package was
**v2**, which has a completely different class-based API (`new PDFParse({ data }).getText()`). I
caught it by checking the actually-installed version and its type definitions before trusting the
assumption, then rewrote the wrapper. (Similar catch: `create-next-app@latest` pulled Next 16 —
pinned back to Next 15 per the brief.)

---

## Tech stack

Next.js 15 (App Router) + React 19 · TypeScript · Tailwind v4 + shadcn/ui · Google Gemini
(`@google/genai`, default `gemini-2.5-flash`) · pdf-parse + mammoth (parsing) · cheerio
(scraping) · Tiptap (editor) · zod (validation). See [`CLAUDE.md`](CLAUDE.md) for architecture.

| Command            | Description                |
|--------------------|----------------------------|
| `npm run dev`      | Dev server                 |
| `npm run build`    | Production build           |
| `npm run start`    | Serve the production build |
| `npm run lint`     | ESLint                     |
| `npx tsc --noEmit` | Type-check                 |

## Deploy (Vercel)

1. Push to GitHub and **Import** the repo in Vercel (auto-detects Next.js).
2. Add `GEMINI_API_KEY` in the project's Environment Variables.
3. Deploy.

> Vercel serverless caps request bodies at ~4.5 MB (below the app's 10 MB upload limit); fine
> for typical resumes.

## Privacy

No auth, no database, no server-side persistence. Resumes and job text are sent to Google Gemini
using your API key and processed in memory for one request. The working session is kept only in
the browser's `sessionStorage` (cleared when the tab closes).
