import { CircleCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MatchingSkillsCard({
  skills,
  onSkillClick,
}: {
  skills: string[];
  onSkillClick?: (skill: string) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleCheckIcon className="size-4 text-emerald-500" />
          Matching skills
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Badge
                key={skill}
                render={
                  onSkillClick ? (
                    <button
                      type="button"
                      onClick={() => onSkillClick(skill)}
                      title={`Emphasize "${skill}" in your letter`}
                    />
                  ) : undefined
                }
                className={cn(
                  "h-auto max-w-full whitespace-normal break-words border-transparent bg-emerald-50 px-2 py-0.5 text-left leading-snug text-emerald-700 [overflow-wrap:anywhere] dark:bg-emerald-500/15 dark:text-emerald-300",
                  onSkillClick &&
                    "cursor-pointer transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/25",
                )}
              >
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No direct skill overlap detected.</p>
        )}
        {skills.length ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {skills.length} {skills.length === 1 ? "skill" : "skills"} match
          </p>
        ) : null}
        {onSkillClick && skills.length ? (
          <p className="text-xs text-muted-foreground">
            Click a skill to emphasize it in your letter.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
