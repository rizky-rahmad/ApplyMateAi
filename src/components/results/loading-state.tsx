import { Loader2Icon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export function LoadingState({
  message = "Analyzing your resume against the job...",
}: {
  message?: string;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin text-primary" />
        {message}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Bar className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-5/6" />
              <Bar className="h-3 w-2/3" />
              <Bar className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 p-0">
        <div className="border-b px-4 py-3">
          <Bar className="h-4 w-40" />
        </div>
        <div className="space-y-2.5 px-4 py-4">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-11/12" />
          <Bar className="h-3 w-4/5" />
        </div>
      </Card>
    </div>
  );
}
