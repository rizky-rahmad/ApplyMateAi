"use client";

import { CircleAlertIcon, FileTextIcon, Link2Icon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { JD_MAX_CHARS, JD_MIN_CHARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type JobMode = "description" | "url";

export function JobInput({
  mode,
  onModeChange,
  description,
  onDescriptionChange,
  url,
  onUrlChange,
  error,
}: {
  mode: JobMode;
  onModeChange: (mode: JobMode) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
  error?: string | null;
}) {
  const tooShort = description.length > 0 && description.length < JD_MIN_CHARS;

  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as JobMode)}>
      <TabsList className="w-full">
        <TabsTrigger value="description" className="flex-1">
          <FileTextIcon />
          Job description
        </TabsTrigger>
        <TabsTrigger value="url" className="flex-1">
          <Link2Icon />
          Job URL
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-3 space-y-1.5">
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, JD_MAX_CHARS))}
          maxLength={JD_MAX_CHARS}
          aria-label="Job description"
          placeholder="Paste the job description here..."
          className="min-h-40 resize-none"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={cn("text-muted-foreground", tooShort && "text-destructive")}>
            {tooShort ? `Minimum ${JD_MIN_CHARS} characters` : " "}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {description.length} / {JD_MAX_CHARS}
          </span>
        </div>
      </TabsContent>

      <TabsContent value="url" className="mt-3 space-y-1.5">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          aria-label="Job posting URL"
          placeholder="https://company.com/careers/job-id"
          className="h-10"
        />
        <p className="text-xs text-muted-foreground">
          Works best with Greenhouse, Lever, and most company career pages.
        </p>
        {error ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
