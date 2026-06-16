import { SparklesIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({ onTrySample }: { onTrySample?: () => void }) {
  return (
    <Card className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <WandSparklesIcon className="size-7" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground">Your analysis will appear here</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          Upload your resume and add a job description or URL, then generate your match analysis
          and a tailored cover letter in seconds.
        </p>
      </div>
      {onTrySample ? (
        <Button variant="outline" onClick={onTrySample} className="h-10">
          <SparklesIcon />
          Try with a sample
        </Button>
      ) : null}
    </Card>
  );
}
