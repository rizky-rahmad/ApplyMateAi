"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUpIcon, DownloadIcon, FilePlus2Icon, Loader2Icon, SparklesIcon } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUpload } from "@/components/input/resume-upload";
import { JobInput, type JobMode } from "@/components/input/job-input";
import { MatchScoreCard } from "@/components/analysis/match-score-card";
import { TopPrioritiesCard } from "@/components/analysis/top-priorities-card";
import { MatchingSkillsCard } from "@/components/analysis/matching-skills-card";
import { MissingSkillsCard } from "@/components/analysis/missing-skills-card";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/results/empty-state";
import { LoadingState } from "@/components/results/loading-state";
import { StreamingCoverLetter } from "@/components/cover-letter/streaming-cover-letter";
import { JD_MIN_CHARS } from "@/lib/constants";
import type { AnalysisCore, RefineAction, TailorMode } from "@/lib/schemas";
import { buildReport, copyToClipboard, downloadDocxFile, downloadTextFile } from "@/lib/export";

// Tiptap is heavy; load it only when the cover-letter editor actually renders
// (after an analysis), keeping the initial bundle lean.
const CoverLetterEditor = dynamic(
  () => import("@/components/cover-letter/cover-letter-editor").then((m) => m.CoverLetterEditor),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />,
  },
);

type Resume = { text: string; filename: string; sizeBytes: number };

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed.");
  return data as T;
}

/** POST to a streaming text route, surfacing the running text via onChunk. */
async function streamTextClient(
  url: string,
  body: unknown,
  signal: AbortSignal,
  onChunk: (text: string) => void,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Could not write the cover letter.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    onChunk(acc);
  }
  return acc;
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

const SAMPLE_RESUME_TEXT = `Jordan Lee — Senior Frontend Developer

Summary: Frontend engineer with 6 years building responsive, accessible web apps with React, TypeScript, and Next.js.

Experience:
- Acme Corp (2021-present): Led the rebuild of the customer dashboard in Next.js + TypeScript, cutting load time by 40%. Built a reusable component library with Tailwind CSS.
- Globex (2018-2021): Developed React SPAs, integrated REST APIs, and set up CI with GitHub Actions.

Skills: React, TypeScript, Next.js, JavaScript, HTML, CSS, Tailwind CSS, Redux, Zustand, REST APIs, Git, Jest, Accessibility, Agile.

Education: BSc Computer Science.`;

const SAMPLE_JOB_DESCRIPTION = `Senior Frontend Developer

We are hiring a Senior Frontend Developer to build modern, performant web applications. Responsibilities: develop responsive UIs in React and Next.js, collaborate with designers and backend engineers, ensure accessibility and performance, and mentor junior developers.

Requirements: 4+ years of React and TypeScript, strong CSS/Tailwind, experience with REST APIs and Git. Nice to have: GraphQL, AWS, Docker, and CI/CD pipelines.`;

export default function Home() {
  const [resume, setResume] = React.useState<Resume | null>(null);
  const [resumeLoading, setResumeLoading] = React.useState(false);
  const [resumeError, setResumeError] = React.useState<string | null>(null);

  const [jobMode, setJobMode] = React.useState<JobMode>("description");
  const [jobDescription, setJobDescription] = React.useState("");
  const [jobUrl, setJobUrl] = React.useState("");

  const [analysis, setAnalysis] = React.useState<AnalysisCore | null>(null);
  const [coverLetter, setCoverLetter] = React.useState("");
  const [generatedLetter, setGeneratedLetter] = React.useState("");
  const [lastJobText, setLastJobText] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [streaming, setStreaming] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [jobError, setJobError] = React.useState<string | null>(null);
  const [pendingSample, setPendingSample] = React.useState(false);

  const resultsRef = React.useRef<HTMLDivElement>(null);
  const genCtrl = React.useRef<AbortController | null>(null);
  const generateRef = React.useRef<() => void>(() => {});

  // Restore the working session on refresh (client-only, ephemeral — cleared with the tab).
  const skipNextPersist = React.useRef(true);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("applymate:session");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.resume) setResume(s.resume);
        if (typeof s.jobMode === "string") setJobMode(s.jobMode);
        if (typeof s.jobDescription === "string") setJobDescription(s.jobDescription);
        if (typeof s.jobUrl === "string") setJobUrl(s.jobUrl);
        if (typeof s.lastJobText === "string") setLastJobText(s.lastJobText);
        if (s.analysis) {
          setAnalysis(s.analysis);
          setCoverLetter(s.coverLetter ?? s.analysis.coverLetter ?? "");
          setGeneratedLetter(s.generatedLetter ?? s.coverLetter ?? s.analysis.coverLetter ?? "");
        }
      }
    } catch {
      // ignore corrupt or blocked storage
    }
  }, []);

  React.useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (streaming) return; // don't thrash storage on every streamed chunk
    try {
      sessionStorage.setItem(
        "applymate:session",
        JSON.stringify({
          resume,
          jobMode,
          jobDescription,
          jobUrl,
          lastJobText,
          analysis,
          coverLetter,
          generatedLetter,
        }),
      );
    } catch {
      // storage may be unavailable (private mode / quota)
    }
  }, [
    resume,
    jobMode,
    jobDescription,
    jobUrl,
    lastJobText,
    analysis,
    coverLetter,
    generatedLetter,
    streaming,
  ]);

  async function uploadResume(file: File) {
    setResumeLoading(true);
    setResumeError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Prefer the server's specific message; fall back with the HTTP status so a
        // non-JSON error (e.g. a 413 too-large or a 500 crash) isn't a dead end.
        const serverError = (data as { error?: string }).error;
        throw new Error(serverError || `Could not read that file (HTTP ${res.status}).`);
      }
      setResume({ text: data.text, filename: data.filename, sizeBytes: data.sizeBytes });
      toast.success("Resume uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setResumeError(message);
      toast.error(message);
    } finally {
      setResumeLoading(false);
    }
  }

  function removeResume() {
    setResume(null);
    setResumeError(null);
  }

  async function resolveJobText(signal?: AbortSignal): Promise<string> {
    if (jobMode === "description") return jobDescription.trim();
    const { text } = await postJSON<{ text: string; source: string }>(
      "/api/scrape-job",
      { url: jobUrl.trim() },
      signal,
    );
    return text;
  }

  async function generate() {
    if (!resume) {
      toast.error("Please upload your resume first.");
      return;
    }
    if (jobMode === "description" && jobDescription.trim().length < JD_MIN_CHARS) {
      toast.error(`Job description must be at least ${JD_MIN_CHARS} characters.`);
      return;
    }
    if (jobMode === "url" && !isValidHttpUrl(jobUrl.trim())) {
      toast.error("Please enter a valid job posting URL.");
      return;
    }

    genCtrl.current?.abort();
    const ctrl = new AbortController();
    genCtrl.current = ctrl;

    setAnalyzing(true);
    setStreaming(false);
    setAnalysis(null);
    setCoverLetter("");
    setGeneratedLetter("");
    setJobError(null);
    try {
      let jobText: string;
      try {
        jobText = await resolveJobText(ctrl.signal);
      } catch (scrapeErr) {
        if (jobMode === "url" && !(scrapeErr instanceof Error && scrapeErr.name === "AbortError")) {
          setJobError(scrapeErr instanceof Error ? scrapeErr.message : "Couldn't fetch that URL.");
        }
        throw scrapeErr;
      }
      if (jobText.trim().length < JD_MIN_CHARS) {
        throw new Error("That job posting did not contain enough detail. Try pasting the description.");
      }
      setLastJobText(jobText);
      const resumeText = resume.text;

      // Stage A: structured analysis -> render the cards.
      const core = await postJSON<AnalysisCore>("/api/analyze", { resumeText, jobText }, ctrl.signal);
      setAnalysis(core);
      setAnalyzing(false);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      }

      // Stage B: stream the cover letter as it is written.
      setStreaming(true);
      const finalLetter = await streamTextClient(
        "/api/cover-letter",
        { resumeText, jobText },
        ctrl.signal,
        setCoverLetter,
      );
      setGeneratedLetter(finalLetter);
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setAnalyzing(false);
      setStreaming(false);
    }
  }

  // Keep a stable handle to the latest generate() for the "Try sample" auto-run.
  generateRef.current = generate;

  React.useEffect(() => {
    if (pendingSample && resume && jobDescription.trim().length >= JD_MIN_CHARS) {
      setPendingSample(false);
      generateRef.current();
    }
  }, [pendingSample, resume, jobDescription]);

  function trySample() {
    setResume({
      text: SAMPLE_RESUME_TEXT,
      filename: "sample-resume.txt",
      sizeBytes: SAMPLE_RESUME_TEXT.length,
    });
    setResumeError(null);
    setJobMode("description");
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setJobUrl("");
    setJobError(null);
    setPendingSample(true);
  }

  async function doRegenerate() {
    if (!resume || !lastJobText) return;
    genCtrl.current?.abort();
    const ctrl = new AbortController();
    genCtrl.current = ctrl;
    const previous = generatedLetter;

    setRegenerating(true);
    setStreaming(true);
    setCoverLetter("");
    try {
      // Only the cover letter changes; the match score & skills stay stable.
      const finalLetter = await streamTextClient(
        "/api/cover-letter",
        { resumeText: resume.text, jobText: lastJobText, regenerate: true },
        ctrl.signal,
        setCoverLetter,
      );
      setGeneratedLetter(finalLetter);
      toast.success("Cover letter regenerated");
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : "Could not regenerate.");
        setCoverLetter(previous);
      }
    } finally {
      setRegenerating(false);
      setStreaming(false);
    }
  }

  function requestRegenerate() {
    if (!resume || !lastJobText) return;
    const edited = coverLetter.trim() !== generatedLetter.trim();
    if (edited) {
      toast.warning("Regenerating will replace your current edits.", {
        action: { label: "Regenerate anyway", onClick: () => void doRegenerate() },
        duration: 8000,
      });
      return;
    }
    void doRegenerate();
  }

  async function refine(action: RefineAction) {
    if (!coverLetter.trim()) return;
    genCtrl.current?.abort();
    const ctrl = new AbortController();
    genCtrl.current = ctrl;
    const source = coverLetter;

    setStreaming(true);
    setCoverLetter("");
    try {
      const finalLetter = await streamTextClient(
        "/api/refine",
        { letter: source, action },
        ctrl.signal,
        setCoverLetter,
      );
      setGeneratedLetter(finalLetter);
      toast.success("Letter refined");
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : "Could not refine the letter.");
        setCoverLetter(source);
      }
    } finally {
      setStreaming(false);
    }
  }

  async function tailorSkill(skill: string, mode: TailorMode) {
    if (!resume || !coverLetter.trim() || streaming) return;
    genCtrl.current?.abort();
    const ctrl = new AbortController();
    genCtrl.current = ctrl;
    const source = coverLetter;

    setStreaming(true);
    setCoverLetter("");
    try {
      const finalLetter = await streamTextClient(
        "/api/tailor",
        { letter: source, resumeText: resume.text, skill, mode },
        ctrl.signal,
        setCoverLetter,
      );
      setGeneratedLetter(finalLetter);
      toast.success(mode === "emphasize" ? `Emphasized "${skill}"` : `Addressed "${skill}"`);
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : "Could not update the letter.");
        setCoverLetter(source);
      }
    } finally {
      setStreaming(false);
    }
  }

  function newAnalysis() {
    genCtrl.current?.abort();
    setAnalysis(null);
    setCoverLetter("");
    setGeneratedLetter("");
    setLastJobText("");
    setAnalyzing(false);
    setStreaming(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCopy() {
    try {
      await copyToClipboard(coverLetter);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy. Try selecting the text manually.");
    }
  }

  function handleDownloadTxt() {
    downloadTextFile("cover-letter.txt", coverLetter);
    toast.success("Downloaded cover-letter.txt");
  }

  async function handleDownloadDocx() {
    try {
      await downloadDocxFile("cover-letter.docx", coverLetter);
      toast.success("Downloaded cover-letter.docx");
    } catch {
      toast.error("Could not generate the DOCX file.");
    }
  }

  function downloadAll() {
    if (!analysis) return;
    downloadTextFile("applymate-analysis.txt", buildReport(analysis, coverLetter));
    toast.success("Downloaded full report");
  }

  const canGenerate =
    !!resume &&
    !analyzing &&
    !streaming &&
    (jobMode === "description"
      ? jobDescription.trim().length >= JD_MIN_CHARS
      : jobUrl.trim().length > 0);

  const generateHint = analyzing || streaming
    ? null
    : !resume
      ? "Upload your resume to get started."
      : jobMode === "description" && jobDescription.trim().length < JD_MIN_CHARS
        ? `Add the job description (at least ${JD_MIN_CHARS} characters).`
        : jobMode === "url" && jobUrl.trim().length === 0
          ? "Paste the job posting URL."
          : null;

  return (
    <div id="top" className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* Sidebar: inputs */}
            <aside id="start" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <StepBadge n={1} />
                    <div>
                      <CardTitle>Upload resume</CardTitle>
                      <CardDescription>PDF or DOCX (max 10MB)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResumeUpload
                    resume={
                      resume
                        ? {
                            filename: resume.filename,
                            sizeBytes: resume.sizeBytes,
                            chars: resume.text.length,
                            preview: resume.text.slice(0, 800),
                          }
                        : null
                    }
                    loading={resumeLoading}
                    error={resumeError}
                    onUpload={uploadResume}
                    onRemove={removeResume}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <StepBadge n={2} />
                    <div>
                      <CardTitle>Add job description</CardTitle>
                      <CardDescription>Paste a description or job URL</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <JobInput
                    mode={jobMode}
                    onModeChange={setJobMode}
                    description={jobDescription}
                    onDescriptionChange={setJobDescription}
                    url={jobUrl}
                    onUrlChange={(v) => {
                      setJobUrl(v);
                      setJobError(null);
                    }}
                    error={jobError}
                  />
                </CardContent>
              </Card>

              <Button
                onClick={generate}
                disabled={!canGenerate}
                aria-describedby={generateHint ? "generate-hint" : undefined}
                className="h-11 w-full text-sm"
              >
                {analyzing ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
                {analyzing ? "Analyzing..." : "Generate analysis"}
              </Button>

              {generateHint ? (
                <p id="generate-hint" className="text-center text-xs text-muted-foreground">
                  {generateHint}
                </p>
              ) : null}
            </aside>

            {/* Results */}
            <section ref={resultsRef}>
              {analysis || analyzing || streaming ? (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("start")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary lg:hidden"
                >
                  <ArrowUpIcon className="size-4" />
                  Edit inputs
                </button>
              ) : null}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Your analysis</h1>
                  <p className="text-sm text-muted-foreground">
                    Here&apos;s your personalized analysis and cover letter
                  </p>
                </div>
                {analysis && !analyzing && !streaming ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={newAnalysis}>
                      <FilePlus2Icon />
                      New analysis
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadAll}>
                      <DownloadIcon />
                      Download all
                    </Button>
                  </div>
                ) : null}
              </div>

              {analyzing ? (
                <LoadingState />
              ) : analysis ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MatchScoreCard
                      score={analysis.matchScore}
                      label={analysis.matchLabel}
                      summary={analysis.matchSummary}
                      concerns={analysis.concerns}
                    />
                    <TopPrioritiesCard items={analysis.topPriorities} />
                    <MatchingSkillsCard
                      skills={analysis.matchingSkills}
                      onSkillClick={(s) => tailorSkill(s, "emphasize")}
                    />
                    <MissingSkillsCard
                      skills={analysis.missingSkills}
                      onSkillClick={(s) => tailorSkill(s, "address")}
                    />
                  </div>
                  {streaming ? (
                    <StreamingCoverLetter content={coverLetter} />
                  ) : (
                    <CoverLetterEditor
                      content={coverLetter}
                      regenerating={regenerating}
                      onChange={setCoverLetter}
                      onRegenerate={requestRegenerate}
                      onRefine={refine}
                      onCopy={handleCopy}
                      onDownloadTxt={handleDownloadTxt}
                      onDownloadDocx={handleDownloadDocx}
                    />
                  )}
                </div>
              ) : (
                <EmptyState onTrySample={trySample} />
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
