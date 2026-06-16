"use client";

import * as React from "react";
import { CheckIcon, CloudUploadIcon, FileTextIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { CircleAlertIcon } from "lucide-react";

export type ResumeInfo = {
  filename: string;
  sizeBytes: number;
  chars: number;
  preview: string;
};

export function ResumeUpload({
  resume,
  loading,
  error,
  onUpload,
  onRemove,
}: {
  resume: ResumeInfo | null;
  loading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onUpload(file);
  }

  if (resume) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <FileTextIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{resume.filename}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(resume.sizeBytes)}</p>
          </div>
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckIcon className="size-3" />
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove resume"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>

        {resume.chars < 400 ? (
          <p className="flex items-start gap-1.5 px-1 text-xs text-orange-600 dark:text-orange-400">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            Only {resume.chars.toLocaleString()} characters extracted. If your resume is a scanned
            image, the text may not read well -- try a text-based PDF or DOCX.
          </p>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">
            Extracted {resume.chars.toLocaleString()} characters of text.
          </p>
        )}

        {resume.preview ? (
          <details className="px-1">
            <summary className="cursor-pointer text-xs font-medium text-primary">
              Preview extracted text
            </summary>
            <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
              {resume.preview}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
        )}
      >
        {loading ? (
          <>
            <Loader2Icon className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading your resume...</p>
          </>
        ) : (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CloudUploadIcon className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">Drag &amp; drop your file here</p>
            <p className="text-xs text-muted-foreground">or</p>
            <span className="text-sm font-semibold text-primary">Choose file</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label="Upload resume file (PDF or DOCX)"
          className="sr-only"
          onChange={(e) => pick(e.target.files)}
        />
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlertIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
