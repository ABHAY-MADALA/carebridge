import type { DailyMetric, MetricKey } from "@/lib/schema";

export function measurementComparison(metrics: DailyMetric[], key: MetricKey, usual: number | null, days = 4) {
  const values = [...metrics].sort((a,b) => a.date.localeCompare(b.date)).slice(-days).map(m => m[key]).filter((v): v is number => v !== null && Number.isFinite(v));
  const recent = values.length ? values.reduce((a,b) => a+b, 0) / values.length : null;
  const direction: "unknown" | "same" | "higher" | "lower" = recent === null || usual === null ? "unknown" : Math.abs(recent-usual) < .05 ? "same" : recent > usual ? "higher" : "lower";
  return { recent, direction, count: values.length };
}
