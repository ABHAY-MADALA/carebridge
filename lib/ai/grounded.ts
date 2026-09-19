import {
  GroundedAnswer,
  type DailyMetric,
  type HealthEvent,
  type TrendDetection,
} from "@/lib/schema";
import { completeJson } from "./provider";
import { GROUNDED_SYSTEM } from "./prompts";
import { containsDiagnosticLanguage, diagnosticReason } from "./guards";
import { METRICS } from "@/lib/health/metrics";
import { relativeDays } from "@/lib/dates";

/*
  Answering a doctor's spoken question on behalf of a patient who cannot answer
  it themselves.

  This is the highest-stakes surface in CareBridge, so it is the most tightly
  constrained. The answer may only contain things that are in the record. If the
  record does not cover the question, the honest answer — "Alex hasn't recorded
  anything about that" — is the correct one, and it is always available because
  the fallback can produce it without any model at all.
*/

const NOT_RECORDED = "I have not recorded anything about that, so I cannot answer it.";

type Context = {
  events: HealthEvent[];
  metrics: DailyMetric[];
  detection: TrendDetection | null;
};

/** A compact view of the record — the model's only source of facts. */
function buildContext({ events, metrics, detection }: Context): string {
  const recent = events.slice(0, 25).map((e) => ({
    id: e.id,
    when: relativeDays(e.occurredAt),
    date: e.occurredAt.slice(0, 10),
    category: e.category,
    label: e.label,
    severity: e.severity,
    where: e.bodyLocation,
    started: e.onset,
    pattern: e.pattern,
    trend: e.trendHint,
    minutes: e.durationMinutes,
    myWords: e.originalInput,
  }));

  const changes = (detection?.signals ?? []).map((s) => ({
    measurement: METRICS[s.metric].label,
    myUsual: METRICS[s.metric].format(s.baselineValue),
    recently: METRICS[s.metric].format(s.currentValue),
    changePercent: Math.round(s.deltaPct),
    comparedWith:
      s.baselineSource === "cycle-phase"
        ? `the same ${s.phase} phase of my previous cycles`
        : "my previous days",
  }));

  const today = metrics[metrics.length - 1];

  return JSON.stringify({
    events: recent,
    measuredChanges: changes,
    cycle: today ? { day: today.cycleDay, phase: today.cyclePhase } : null,
    note: "These are the only facts available. Anything not here is not recorded.",
  });
}

// ---------------------------------------------------------------------------
// Deterministic answering
// ---------------------------------------------------------------------------

type Matcher = {
  test: RegExp;
  answer: (ctx: Context) => { text: string; ids: string[] } | null;
};

/*
  "When did this start?" means this episode, not the whole record. Without a
  window the answer reaches back to an unrelated period entry from last month.
*/
const EPISODE_DAYS = 7;

function episode(events: HealthEvent[]): HealthEvent[] {
  const cutoff = Date.now() - EPISODE_DAYS * 86_400_000;
  return events.filter(
    (e) =>
      new Date(e.occurredAt).getTime() >= cutoff &&
      ["pain", "fatigue", "illness"].includes(e.category),
  );
}

function topSymptom(events: HealthEvent[], category?: string) {
  const pool = events.filter(
    (e) =>
      (category ? e.category === category : true) &&
      ["pain", "fatigue", "illness"].includes(e.category),
  );
  if (!pool.length) return null;
  return pool.reduce((best, e) =>
    (e.severity ?? 0) > (best.severity ?? 0) ? e : best,
  );
}

function signalFor(detection: TrendDetection | null, metric: keyof typeof METRICS) {
  return detection?.signals.find((s) => s.metric === metric) ?? null;
}

function describeSignal(
  detection: TrendDetection | null,
  metric: keyof typeof METRICS,
): string | null {
  const s = signalFor(detection, metric);
  if (!s) return null;
  const meta = METRICS[metric];
  return `${meta.phrase(s.baselineValue, s.currentValue)}, compared with ${
    s.baselineSource === "cycle-phase"
      ? `the same ${s.phase} phase of my previous cycles`
      : "my earlier days"
  }.`;
}

const MATCHERS: Matcher[] = [
  {
    // When did it start?
    test: /\b(when|how long|since when|start(?:ed)?|began|begin|onset)\b/i,
    answer: ({ events }) => {
      const pool = episode(events);
      if (!pool.length) return null;

      // The patient's own words about onset beat our computed date.
      const stated = pool.find((e) => e.onset);
      const earliest = pool.reduce((a, b) => (a.occurredAt < b.occurredAt ? a : b));

      if (stated) {
        const ids = [...new Set([stated.id, earliest.id])];
        return {
          text: `The ${stated.label.toLowerCase()} started ${stated.onset}. My earliest record of this is from ${relativeDays(
            earliest.occurredAt,
          )}.`,
          ids,
        };
      }

      return {
        text: `My earliest record of this is from ${relativeDays(
          earliest.occurredAt,
        )}, for ${earliest.label.toLowerCase()}.`,
        ids: [earliest.id],
      };
    },
  },
  {
    // How bad is it?
    test: /\b(how (?:bad|severe|strong|painful|much)|severity|pain level|scale|out of ten)\b/i,
    answer: ({ events, detection }) => {
      const s = topSymptom(events);
      if (!s || s.severity === null) return null;
      const change = describeSignal(detection, "painLevel");
      return {
        text: `The worst I have recorded is ${s.severity} out of 10, for ${s.label.toLowerCase()}.${
          change ? ` ${change}` : ""
        }`,
        ids: [s.id],
      };
    },
  },
  {
    test: /\b(sleep|sleeping|slept|insomnia|rest)\b/i,
    answer: ({ events, detection }) => {
      const change = describeSignal(detection, "sleepMinutes");
      const ev = events.find((e) => e.category === "sleep");
      if (!change && !ev) return null;
      return {
        text:
          change ??
          `I recorded ${ev!.label.toLowerCase()}${
            ev!.durationMinutes ? ` of about ${Math.round(ev!.durationMinutes / 60)} hours` : ""
          } ${relativeDays(ev!.occurredAt)}.`,
        ids: ev ? [ev.id] : [],
      };
    },
  },
  {
    test: /\b(heart rate|pulse|bpm|resting)\b/i,
    answer: ({ detection }) => {
      const change = describeSignal(detection, "restingHeartRate");
      return change ? { text: change, ids: [] } : null;
    },
  },
  {
    test: /\b(activity|active|steps|walking|exercise|moving)\b/i,
    answer: ({ detection }) => {
      const change = describeSignal(detection, "steps");
      return change ? { text: change, ids: [] } : null;
    },
  },
  {
    test: /\b(tired|fatigue|energy|exhausted)\b/i,
    answer: ({ events, detection }) => {
      const change = describeSignal(detection, "fatigueLevel");
      const ev = events.find((e) => e.category === "fatigue");
      if (!change && !ev) return null;
      return {
        text: change ?? `I recorded fatigue ${relativeDays(ev!.occurredAt)}${
          ev!.severity !== null ? ` at ${ev!.severity} out of 10` : ""
        }.`,
        ids: ev ? [ev.id] : [],
      };
    },
  },
  {
    test: /\b(where|location|which part|point to)\b/i,
    answer: ({ events }) => {
      const ev = events.find((e) => e.bodyLocation);
      return ev
        ? { text: `I have been feeling it in my ${ev.bodyLocation!.toLowerCase()}.`, ids: [ev.id] }
        : null;
    },
  },
  {
    test: /\b(medication|medicine|taking|pills?|tablets?|ibuprofen|painkiller|drugs?)\b/i,
    answer: ({ events }) => {
      const meds = events.filter((e) => e.category === "medication").slice(0, 3);
      if (!meds.length) return null;
      return {
        text: `I recorded ${meds
          .map((m) => `${m.label.toLowerCase()} ${relativeDays(m.occurredAt)}`)
          .join(", and ")}.`,
        ids: meds.map((m) => m.id),
      };
    },
  },
  {
    test: /\b(appetite|eating|eat|hungry|food|weight)\b/i,
    answer: ({ events }) => {
      const ev = events.find((e) => e.category === "food");
      return ev
        ? { text: `I recorded ${ev.label.toLowerCase()} ${relativeDays(ev.occurredAt)}.`, ids: [ev.id] }
        : null;
    },
  },
  {
    test: /\b(period|cycle|menstrual|bleeding)\b/i,
    answer: ({ events, metrics }) => {
      const ev = events.find((e) => e.category === "cycle");
      const today = metrics[metrics.length - 1];
      if (!ev && !today?.cyclePhase) return null;
      const parts: string[] = [];
      if (ev) parts.push(`I recorded "${ev.label.toLowerCase()}" ${relativeDays(ev.occurredAt)}`);
      if (today?.cycleDay) parts.push(`I am on day ${today.cycleDay} of my cycle, in the ${today.cyclePhase} phase`);
      return { text: `${parts.join(". ")}.`, ids: ev ? [ev.id] : [] };
    },
  },
  {
    test: /\b(what(?:'s| is| has)? ?chang\w*|anything else|different|worse|better|summary|going on|brings you)\b/i,
    answer: ({ detection, events }) => {
      if (!detection?.signals.length) return null;
      const lines = detection.signals.map((s) => METRICS[s.metric].phrase(s.baselineValue, s.currentValue));
      return {
        text: `${lines.join(". ")}. All of that is compared with my own usual pattern, not with anyone else.`,
        ids: events.slice(0, 2).map((e) => e.id),
      };
    },
  },
];

export function fallbackAnswer(question: string, ctx: Context): GroundedAnswer {
  for (const m of MATCHERS) {
    if (!m.test.test(question)) continue;
    const result = m.answer(ctx);
    if (result) {
      return {
        answered: true,
        answer: result.text,
        citedEventIds: result.ids,
        source: "fallback",
      };
    }
  }

  return {
    answered: false,
    answer: NOT_RECORDED,
    citedEventIds: [],
    source: "fallback",
  };
}

// ---------------------------------------------------------------------------

export async function answerFromRecord(
  question: string,
  ctx: Context,
): Promise<GroundedAnswer> {
  const deterministic = fallbackAnswer(question, ctx);

  const raw = await completeJson(
    GROUNDED_SYSTEM,
    [
      { role: "user", content: `MY HEALTH RECORD:\n${buildContext(ctx)}` },
      { role: "user", content: `THE DOCTOR ASKED: ${question}` },
    ],
    500,
  );
  if (!raw) return deterministic;

  const parsed = GroundedAnswer.safeParse({ ...(raw as object), source: "llm" });
  if (!parsed.success) return deterministic;

  const answer = parsed.data;

  if (containsDiagnosticLanguage(answer.answer)) {
    console.warn(
      `[carebridge] grounded answer blocked ("${diagnosticReason(answer.answer)}")`,
    );
    return deterministic;
  }

  // A model claiming to have answered while citing nothing is the exact failure
  // mode that matters here, so prefer the deterministic answer in that case.
  if (answer.answered && answer.citedEventIds.length === 0 && deterministic.answered) {
    return deterministic;
  }

  if (!answer.answer.trim()) return deterministic;

  // Drop any id the model invented.
  const known = new Set(ctx.events.map((e) => e.id));
  return { ...answer, citedEventIds: answer.citedEventIds.filter((id) => known.has(id)) };
}
