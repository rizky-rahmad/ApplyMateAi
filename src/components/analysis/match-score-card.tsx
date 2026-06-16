import { TriangleAlertIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SCORE_LABEL_TEXT, ScoreRing, scoreTone } from "./score-ring";
import { cn } from "@/lib/utils";

export function MatchScoreCard({
  score,
  label,
  summary,
  concerns = [],
}: {
  score: number;
  label: string;
  summary: string;
  concerns?: string[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Match score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <ScoreRing score={score} />
        <div>
          <p className={cn("font-semibold", SCORE_LABEL_TEXT[scoreTone(score)])}>{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        {concerns.length ? (
          <div className="w-full space-y-1.5 border-t pt-3 text-left">
            <p className="text-xs font-medium text-foreground">Why not higher</p>
            <ul className="space-y-1">
              {concerns.map((concern, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <TriangleAlertIcon className="mt-0.5 size-3 shrink-0 text-amber-500" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
