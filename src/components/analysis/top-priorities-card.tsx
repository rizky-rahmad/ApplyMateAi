import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopPrioritiesCard({ items }: { items: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top priorities</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 break-words [overflow-wrap:anywhere] text-foreground/90">
                {item}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
