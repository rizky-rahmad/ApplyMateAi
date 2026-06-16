"use client";

import { Loader2Icon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StreamingCoverLetter({ content }: { content: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Your tailored cover letter</h2>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Writing...
        </span>
      </div>
      <Card className="p-0">
        <div className="px-4 py-3">
          {content ? (
            <div className="tiptap whitespace-pre-wrap" aria-live="polite" aria-busy="true">
              {content}
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-[-2px]" />
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">
              Preparing your letter...
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
