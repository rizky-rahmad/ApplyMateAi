export type ScoreTone = "strong" | "good" | "weak";

/** Map a 0-100 match score to a semantic tone. */
export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "strong";
  if (score >= 50) return "good";
  return "weak";
}

const RING_STROKE: Record<ScoreTone, string> = {
  strong: "stroke-emerald-500",
  good: "stroke-amber-500",
  weak: "stroke-rose-500",
};

/** AA-contrast text colors for the match label, by tone. */
export const SCORE_LABEL_TEXT: Record<ScoreTone, string> = {
  strong: "text-emerald-700 dark:text-emerald-400",
  good: "text-amber-700 dark:text-amber-400",
  weak: "text-rose-700 dark:text-rose-400",
};

export function ScoreRing({ score }: { score: number }) {
  const size = 128;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const offset = circumference - (pct / 100) * circumference;
  const tone = scoreTone(pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Match score ${pct} percent`}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none ${RING_STROKE[tone]} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-bold tracking-tight text-foreground">{pct}</span>
          <span className="text-base font-semibold text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}
