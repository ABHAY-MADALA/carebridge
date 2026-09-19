import type { MetricKey } from "@/lib/schema";

export type MetricMeta = {
  key: MetricKey;
  label: string;
  /** The direction that represents things getting worse for this person. */
  adverse: "up" | "down";
  /*
    The smallest absolute change worth mentioning, per metric.

    A single percentage threshold across all metrics does not work: resting
    heart rate moving 71 -> 86 is a large, obvious change but only ~18%, while
    step counts swing 20% between an ordinary Tuesday and Saturday. So each
    metric declares its own floor, and the statistical test (z-score against
    this person's own baseline) does the rest of the work.
  */
  minChange: number;
  format: (v: number) => string;
  /** Plain-language phrasing used in summaries and spoken output. */
  phrase: (from: number, to: number) => string;
};

function hoursMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export const METRICS: Record<MetricKey, MetricMeta> = {
  sleepMinutes: {
    key: "sleepMinutes",
    label: "Sleep",
    adverse: "down",
    minChange: 30, // half an hour of sleep
    format: hoursMinutes,
    phrase: (a, b) => `Sleep went from ${hoursMinutes(a)} to ${hoursMinutes(b)} a night`,
  },
  restingHeartRate: {
    key: "restingHeartRate",
    label: "Resting heart rate",
    adverse: "up",
    minChange: 5, // beats per minute
    format: (v) => `${Math.round(v)} BPM`,
    phrase: (a, b) =>
      `Resting heart rate went from ${Math.round(a)} to ${Math.round(b)} beats per minute`,
  },
  steps: {
    key: "steps",
    label: "Activity",
    adverse: "down",
    minChange: 1200, // steps
    format: (v) => `${Math.round(v).toLocaleString("en-US")} steps`,
    phrase: (a, b) =>
      `Daily activity went from about ${Math.round(a).toLocaleString("en-US")} to ${Math.round(
        b,
      ).toLocaleString("en-US")} steps`,
  },
  painLevel: {
    key: "painLevel",
    label: "Pain",
    adverse: "up",
    minChange: 1, // one point on the 0-10 scale
    format: (v) => `${v.toFixed(1).replace(/\.0$/, "")}/10`,
    phrase: (a, b) =>
      `Pain went from about ${Math.round(a)} out of 10 to about ${Math.round(b)} out of 10`,
  },
  fatigueLevel: {
    key: "fatigueLevel",
    label: "Fatigue",
    adverse: "up",
    minChange: 1,
    format: (v) => `${v.toFixed(1).replace(/\.0$/, "")}/10`,
    phrase: (a, b) =>
      `Fatigue went from about ${Math.round(a)} out of 10 to about ${Math.round(b)} out of 10`,
  },
};

export const METRIC_ORDER: MetricKey[] = [
  "painLevel",
  "fatigueLevel",
  "sleepMinutes",
  "steps",
  "restingHeartRate",
];

export const PHASE_LABEL: Record<string, string> = {
  menstrual: "menstrual",
  follicular: "follicular",
  ovulatory: "ovulatory",
  luteal: "luteal",
};
