import { cn } from "@/lib/utils";

/*
  One row: usual vs. recent vs. change. Replaces the ad hoc tables that used
  to appear in WhyAmISeeingThis and the clinician measurements section —
  same three numbers, one consistent shape everywhere they're shown.
*/
export function HealthMetric({
  label,
  usual,
  recent,
  delta,
  adverse,
  emphasize,
}: {
  label: string;
  usual: string;
  recent: string;
  /** Formatted change, e.g. "+47% (z=4.9)" — omit for "no material change". */
  delta?: string;
  /** True when the direction of change is the unfavorable one for this metric. */
  adverse?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-3.5 last:border-0">
      <p className={cn("font-medium text-ink", emphasize && "font-semibold")}>{label}</p>
      <div className="flex items-baseline gap-6">
        <div className="text-right">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Usual</p>
          <p className="text-base text-muted">{usual}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Recent</p>
          <p className={cn("text-base", emphasize ? "font-semibold" : "font-medium", adverse && "text-warn")}>
            {recent}
          </p>
        </div>
        {delta && (
          <p className={cn("w-24 text-right text-sm font-semibold", adverse ? "text-warn" : "text-muted")}>
            {delta}
          </p>
        )}
      </div>
    </div>
  );
}
