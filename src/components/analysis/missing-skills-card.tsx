import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MissingSkillsCard({
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
          <TriangleAlertIcon className="size-4 text-orange-500" />
          Missing / weak skills
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
                      title={`Address "${skill}" honestly in your letter`}
                    />
                  ) : undefined
                }
                className={cn(
                  "h-auto max-w-full whitespace-normal break-words border-transparent bg-orange-50 px-2 py-0.5 text-left leading-snug text-orange-700 [overflow-wrap:anywhere] dark:bg-orange-500/15 dark:text-orange-300",
                  onSkillClick &&
                    "cursor-pointer transition-colors hover:bg-orange-100 dark:hover:bg-orange-500/25",
                )}
              >
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            No notable gaps. Nice work!
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {onSkillClick && skills.length
            ? "Nice-to-have skills from the job. Click one to address it honestly in your letter."
            : "These are nice-to-have skills mentioned in the job description that you might want to highlight if you have experience with them."}
        </p>
      </CardContent>
    </Card>
  );
}
