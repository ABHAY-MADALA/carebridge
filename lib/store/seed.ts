import type { CyclePhase, DailyMetric, HealthEvent } from "@/lib/schema";
import { addDays, dateKey, startOfToday } from "@/lib/dates";

/*
  Alex — the demo patient.

  A judge should not have to wait 30 days to see HealthThread work, so the history
  is synthetic but deterministic: the same seed produces the same numbers on
  every machine and every run, which means the demo never surprises you.

  HISTORY LENGTH. The plan called for ~30 days. That is not enough for the thing
  we are actually demonstrating: a cycle-aware baseline compares today against
  the SAME phase of previous cycles, and with a 28-day cycle a 30-day history
  contains only one or two comparable luteal days. So we generate three cycles
  (84 days). The recent 30 days are what the timeline emphasises; the older days
  exist so the baseline has something honest to stand on.
*/

const CYCLE_LENGTH = 28;
const HISTORY_DAYS = 84;

/** Today is deliberately placed mid-luteal, where PMOS symptoms cluster. */
const TODAY_CYCLE_DAY = 24;

/*
  The change builds over a week rather than appearing overnight. A step change
  would be trivial to detect and would demonstrate nothing; a gradual drift is
  both more realistic and the actual reason a baseline is useful.
*/
const DRIFT_DAYS = 7;

export function phaseForCycleDay(day: number): CyclePhase {
  if (day <= 5) return "menstrual";
  if (day <= 13) return "follicular";
  if (day <= 16) return "ovulatory";
  return "luteal";
}

/** mulberry32 — small, fast, and identical across runs. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Alex's usual day, before any cycle effect. */
const BASE = {
  sleepMinutes: 440, // 7h 20m
  restingHeartRate: 71,
  steps: 8200,
  painLevel: 3,
  fatigueLevel: 3,
};

/*
  Cycle effects. This is the heart of the technical argument: Alex's pain is
  genuinely higher during the luteal and menstrual phases even on a normal
  month. Comparing today against a flat 30-day average would flag that ordinary
  variation as a change. Comparing against the same phase does not.
*/
const PHASE_EFFECT: Record<CyclePhase, Partial<typeof BASE>> = {
  menstrual: {
    painLevel: 2.0,
    fatigueLevel: 1.5,
    sleepMinutes: -25,
    steps: -1200,
    restingHeartRate: 3,
  },
  follicular: {
    painLevel: -0.6,
    fatigueLevel: -0.5,
    sleepMinutes: 12,
    steps: 700,
    restingHeartRate: -1,
  },
  ovulatory: {
    painLevel: 0.3,
    fatigueLevel: 0,
    sleepMinutes: 0,
    steps: 300,
    restingHeartRate: 0,
  },
  luteal: {
    painLevel: 1.2,
    fatigueLevel: 1.0,
    sleepMinutes: -15,
    steps: -600,
    restingHeartRate: 2,
  },
};

/** Where the last four days end up. */
const DRIFT_TARGET = {
  sleepMinutes: 310, // 5h 10m
  restingHeartRate: 86,
  steps: 4900,
  painLevel: 7,
  fatigueLevel: 7,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function buildMetrics(): DailyMetric[] {
  const rand = rng(20260918);
  const today = startOfToday();
  const out: DailyMetric[] = [];

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    // offset 0 is today, which we pin to TODAY_CYCLE_DAY.
    const cycleDay = (((TODAY_CYCLE_DAY - 1 - offset) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH + 1;
    const phase = phaseForCycleDay(cycleDay);
    const effect = PHASE_EFFECT[phase];

    const noise = (amp: number) => (rand() - 0.5) * 2 * amp;

    let sleep = BASE.sleepMinutes + (effect.sleepMinutes ?? 0) + noise(22);
    let hr = BASE.restingHeartRate + (effect.restingHeartRate ?? 0) + noise(2.2);
    let steps = BASE.steps + (effect.steps ?? 0) + noise(900);
    let pain = BASE.painLevel + (effect.painLevel ?? 0) + noise(0.7);
    let fatigue = BASE.fatigueLevel + (effect.fatigueLevel ?? 0) + noise(0.7);

    if (offset < DRIFT_DAYS) {
      const t = (DRIFT_DAYS - offset) / DRIFT_DAYS;
      const ease = Math.pow(t, 1.3); // slightly slow onset, steady worsening
      const to = (from: number, target: number) => from + (target - from) * ease;
      sleep = to(sleep, DRIFT_TARGET.sleepMinutes);
      hr = to(hr, DRIFT_TARGET.restingHeartRate);
      steps = to(steps, DRIFT_TARGET.steps);
      pain = to(pain, DRIFT_TARGET.painLevel);
      fatigue = to(fatigue, DRIFT_TARGET.fatigueLevel);
    }

    out.push({
      date: dateKey(date),
      sleepMinutes: Math.round(clamp(sleep, 200, 620)),
      restingHeartRate: Math.round(clamp(hr, 50, 110)),
      steps: Math.round(clamp(steps, 500, 20000)),
      painLevel: Number(clamp(pain, 0, 10).toFixed(1)),
      fatigueLevel: Number(clamp(fatigue, 0, 10).toFixed(1)),
      cycleDay,
      cyclePhase: phase,
      source: "demo",
    });
  }

  return out;
}

type SeedEvent = {
  daysAgo: number;
  hour: number;
  minute: number;
  category: HealthEvent["category"];
  label: string;
  severity?: number;
  bodyLocation?: string;
  onset?: string;
  pattern?: string;
  trendHint?: HealthEvent["trendHint"];
  durationMinutes?: number;
  originalInput: string;
  inputMethod: HealthEvent["inputMethod"];
  language?: string;
  translation?: string;
};

/*
  Patient-reported events. Sparse and unremarkable through the stable weeks,
  denser and more concerned over the last four days — which is how someone
  actually uses an app like this.
*/
const SEED_EVENTS: SeedEvent[] = [
  /*
    These two must land on cycle days 1 and 2. The cycle model derives the
    phase from the date, so a "Period started" event on any other day renders
    as "luteal phase" on the timeline — a contradiction that would discredit
    the cycle-aware baseline in front of anyone who knows how cycles work.
    With TODAY_CYCLE_DAY = 24, cycle day 1 is exactly 23 days ago.
  */
  {
    daysAgo: 23,
    hour: 9,
    minute: 5,
    category: "cycle",
    label: "Period started",
    originalInput: "Period started today.",
    inputMethod: "form",
  },
  {
    daysAgo: 22,
    hour: 20,
    minute: 30,
    category: "pain",
    label: "Cramps",
    severity: 5,
    bodyLocation: "Lower abdomen",
    onset: "this morning",
    originalInput: "Usual first day cramps, took a heat pad and it helped.",
    inputMethod: "text",
  },
  {
    daysAgo: 21,
    hour: 8,
    minute: 15,
    category: "sleep",
    label: "Slept well",
    durationMinutes: 462,
    originalInput: "Slept really well last night.",
    inputMethod: "form",
  },
  {
    daysAgo: 18,
    hour: 18,
    minute: 40,
    category: "mood",
    label: "Good day",
    originalInput: "Felt pretty normal today, went for a long walk.",
    inputMethod: "text",
  },
  {
    daysAgo: 12,
    hour: 14,
    minute: 10,
    category: "pain",
    label: "Mild abdominal pain",
    severity: 3,
    bodyLocation: "Lower abdomen",
    onset: "after lunch",
    originalInput: "A little bit of the usual ache, nothing unusual.",
    inputMethod: "voice",
  },
  {
    daysAgo: 7,
    hour: 21,
    minute: 0,
    category: "medication",
    label: "Ibuprofen 400mg",
    originalInput: "Took ibuprofen for a headache.",
    inputMethod: "form",
  },

  // --- The last four days: the change the demo is about ---
  {
    daysAgo: 3,
    hour: 19,
    minute: 25,
    category: "pain",
    label: "Abdominal pain",
    severity: 4,
    bodyLocation: "Lower abdomen",
    onset: "this afternoon",
    trendHint: "worse",
    originalInput: "My lower stomach is aching more than it usually does this week.",
    inputMethod: "voice",
  },
  {
    daysAgo: 2,
    hour: 7,
    minute: 50,
    category: "sleep",
    label: "Poor sleep",
    durationMinutes: 331,
    severity: 5,
    originalInput: "Kept waking up, I don't think I slept more than five hours.",
    inputMethod: "text",
  },
  {
    daysAgo: 2,
    hour: 15,
    minute: 10,
    category: "fatigue",
    label: "Fatigue",
    severity: 6,
    pattern: "Around 3 PM",
    trendHint: "worse",
    originalInput: "I get really tired around 3 in the afternoon now.",
    inputMethod: "voice",
  },
  {
    daysAgo: 1,
    hour: 13,
    minute: 5,
    category: "food",
    label: "Reduced appetite",
    originalInput: "Didn't really want lunch, I haven't been hungry lately.",
    inputMethod: "text",
  },
  {
    daysAgo: 1,
    hour: 20,
    minute: 42,
    category: "pain",
    label: "Abdominal pain",
    severity: 6,
    bodyLocation: "Lower abdomen",
    onset: "3 days ago",
    trendHint: "worse",
    originalInput: "It started hurting more after dinner.",
    inputMethod: "voice",
  },
  {
    daysAgo: 0,
    hour: 9,
    minute: 30,
    category: "fatigue",
    label: "Fatigue",
    severity: 7,
    trendHint: "worse",
    originalInput: "Woke up already tired.",
    inputMethod: "text",
  },
];

export function buildEvents(): HealthEvent[] {
  const today = startOfToday();

  return SEED_EVENTS.map((s, i) => {
    const d = addDays(today, -s.daysAgo);
    d.setHours(s.hour, s.minute, 0, 0);
    const iso = d.toISOString();

    const cycleDay =
      (((TODAY_CYCLE_DAY - 1 - s.daysAgo) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH + 1;

    return {
      id: `seed-${String(i).padStart(3, "0")}`,
      occurredAt: iso,
      recordedAt: iso,
      category: s.category,
      label: s.label,
      severity: s.severity ?? null,
      bodyLocation: s.bodyLocation ?? null,
      onset: s.onset ?? null,
      pattern: s.pattern ?? null,
      trendHint: s.trendHint ?? null,
      durationMinutes: s.durationMinutes ?? null,
      cycleDay,
      cyclePhase: phaseForCycleDay(cycleDay),
      originalInput: s.originalInput,
      inputLanguage: s.language ?? "en",
      translation: s.translation ?? null,
      inputMethod: s.inputMethod,
      note: null,
    } satisfies HealthEvent;
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export const DEMO_PATIENT = {
  name: "Alex",
  cycleLength: CYCLE_LENGTH,
  todayCycleDay: TODAY_CYCLE_DAY,
  historyDays: HISTORY_DAYS,
};
