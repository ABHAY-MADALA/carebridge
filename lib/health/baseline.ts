import type { BaselineStat, CyclePhase, DailyMetric, MetricKey } from "@/lib/schema";
import { METRIC_ORDER } from "./metrics";

/*
  "What is normal for YOU?"

  CareBridge never compares a patient against a generic person. It compares
  them against their own history — and, because symptoms move with the
  menstrual cycle, against their own history IN THE SAME CYCLE PHASE.

  This is deterministic TypeScript on purpose. It is the part of the product
  that has to be defensible, so no language model touches it.
*/

/** Below this, a phase-specific baseline is too thin to trust. */
const MIN_PHASE_SAMPLES = 5;

function meanOf(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sdOf(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function valuesFor(rows: DailyMetric[], metric: MetricKey): number[] {
  return rows
    .map((r) => r[metric])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export type BaselineSet = Record<MetricKey, BaselineStat | null>;

/**
 * Baseline for one cycle phase, computed from history only.
 *
 * `excludeDates` holds the days being evaluated — they must not be part of the
 * baseline they are compared against, or a sustained change quietly absorbs
 * itself into "normal" and the patient is never told.
 */
export function computeBaseline(
  metrics: DailyMetric[],
  phase: CyclePhase | null,
  excludeDates: Set<string> = new Set(),
): BaselineSet {
  const history = metrics.filter((m) => !excludeDates.has(m.date));
  const samePhase = phase ? history.filter((m) => m.cyclePhase === phase) : [];

  const out = {} as BaselineSet;

  for (const metric of METRIC_ORDER) {
    const phaseValues = valuesFor(samePhase, metric);

    // Prefer the cycle-aware baseline; fall back to all days when this person
    // has not yet recorded enough of this phase. The UI always says which.
    const usePhase = phaseValues.length >= MIN_PHASE_SAMPLES;
    const values = usePhase ? phaseValues : valuesFor(history, metric);

    if (values.length < 2) {
      out[metric] = null;
      continue;
    }

    const mean = meanOf(values);
    out[metric] = {
      metric,
      mean,
      sd: sdOf(values, mean),
      n: values.length,
      source: usePhase ? "cycle-phase" : "all-days",
      phase: usePhase ? phase : null,
    };
  }

  return out;
}

/** Per-phase averages, for the chart that shows why the phase matters. */
export function baselineByPhase(
  metrics: DailyMetric[],
  metric: MetricKey,
): { phase: CyclePhase; mean: number; n: number }[] {
  const phases: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  return phases
    .map((phase) => {
      const values = valuesFor(
        metrics.filter((m) => m.cyclePhase === phase),
        metric,
      );
      return { phase, mean: values.length ? meanOf(values) : 0, n: values.length };
    })
    .filter((p) => p.n > 0);
}
