import type {
  DailyMetric,
  MetricKey,
  TrendDetection,
  TrendSignal,
} from "@/lib/schema";
import { computeBaseline } from "./baseline";
import { METRICS, METRIC_ORDER } from "./metrics";

/*
  Multi-signal change detection.

  The rule that matters: one number moving is NOT a change worth telling
  someone about. People sleep badly for ordinary reasons. HealthThread speaks up
  only when several parts of a person's health move away from their own
  baseline together, in the direction that means "worse".

  Deterministic on purpose — see baseline.ts.
*/

export const WINDOW_DAYS = 4;

/** How far from this person's own normal a metric must sit to count. */
const MIN_Z = 1.0;

/** How many metrics must move together before the patient is told anything. */
export const MIN_SIGNALS = 3;

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function detectTrend(
  metrics: DailyMetric[],
  windowDays: number = WINDOW_DAYS,
): TrendDetection {
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowDays);
  const phase = window.length ? (window[window.length - 1].cyclePhase ?? null) : null;

  const empty: TrendDetection = {
    detectedAt: new Date().toISOString(),
    windowDays,
    signals: [],
    evaluated: [],
    triggered: false,
    phase,
  };

  if (window.length < 2) return empty;

  const excluded = new Set(window.map((w) => w.date));
  const baseline = computeBaseline(sorted, phase, excluded);

  const evaluated: TrendSignal[] = [];

  for (const key of METRIC_ORDER) {
    const stat = baseline[key];
    if (!stat) continue;

    const values = window
      .map((w) => w[key as MetricKey])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!values.length) continue;

    const currentValue = mean(values);
    const delta = currentValue - stat.mean;

    // A zero SD means this person has been perfectly steady; any real movement
    // is then meaningful, so treat it as a large z rather than dividing by zero.
    const z = stat.sd > 0.0001 ? delta / stat.sd : delta === 0 ? 0 : Math.sign(delta) * 99;

    evaluated.push({
      metric: key,
      baselineValue: stat.mean,
      currentValue,
      deltaPct: stat.mean !== 0 ? (delta / Math.abs(stat.mean)) * 100 : 0,
      direction: delta >= 0 ? "up" : "down",
      z,
      baselineSource: stat.source,
      phase: stat.phase,
      n: stat.n,
    });
  }

  const signals = evaluated.filter((s) => {
    const meta = METRICS[s.metric];
    const movedAdversely = s.direction === meta.adverse;
    const statisticallyUnusual = Math.abs(s.z) >= MIN_Z;
    const largeEnoughToMention =
      Math.abs(s.currentValue - s.baselineValue) >= meta.minChange;
    return movedAdversely && statisticallyUnusual && largeEnoughToMention;
  });

  return {
    detectedAt: new Date().toISOString(),
    windowDays,
    signals,
    evaluated,
    triggered: signals.length >= MIN_SIGNALS,
    phase,
  };
}

/** Daily series for one metric, with the baseline drawn alongside it. */
export function seriesFor(
  metrics: DailyMetric[],
  key: MetricKey,
  days: number,
  baselineValue: number | null,
) {
  return [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map((m) => ({
      date: m.date,
      short: m.date.slice(5),
      value: m[key],
      baseline: baselineValue,
      phase: m.cyclePhase,
    }));
}
