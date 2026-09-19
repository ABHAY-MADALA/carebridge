import { z } from "zod";

/*
  The single internal language of CareBridge.

  Voice, text, the body map and the plain forms all converge on HealthEvent.
  Nothing downstream — timeline, baseline, trends, summary, clinician view —
  needs to know how a piece of information arrived.
*/

export const CyclePhase = z.enum(["menstrual", "follicular", "ovulatory", "luteal"]);
export type CyclePhase = z.infer<typeof CyclePhase>;

export const Category = z.enum([
  "pain",
  "illness",
  "fatigue",
  "medication",
  "sleep",
  "cycle",
  "food",
  "mood",
  "doctor_instruction",
  "other",
]);
export type Category = z.infer<typeof Category>;

export const InputMethod = z.enum(["voice", "text", "visual", "form", "clinician"]);
export type InputMethod = z.infer<typeof InputMethod>;

export const TrendHint = z.enum(["better", "same", "worse"]);
export type TrendHint = z.infer<typeof TrendHint>;

export const HealthEvent = z.object({
  id: z.string(),
  /** When the health thing happened (not when it was typed). */
  occurredAt: z.string(),
  recordedAt: z.string(),
  category: Category,
  /** Short human label, e.g. "Abdominal pain". Never a diagnosis. */
  label: z.string().min(1),
  severity: z.number().min(0).max(10).nullable().default(null),
  bodyLocation: z.string().nullable().default(null),
  /** Free text as the patient expressed it: "three days ago", "after dinner". */
  onset: z.string().nullable().default(null),
  /** Recurring shape: "around 3 PM", "every morning". */
  pattern: z.string().nullable().default(null),
  trendHint: TrendHint.nullable().default(null),
  durationMinutes: z.number().nullable().default(null),
  cycleDay: z.number().nullable().default(null),
  cyclePhase: CyclePhase.nullable().default(null),

  /*
    The patient's own words, always kept. If they spoke Spanish, originalInput
    stays Spanish and `translation` holds the English. Translation is additive;
    it never replaces what the person actually said.
  */
  originalInput: z.string().default(""),
  inputLanguage: z.string().default("en"),
  translation: z.string().nullable().default(null),
  inputMethod: InputMethod,
  note: z.string().nullable().default(null),
});
export type HealthEvent = z.infer<typeof HealthEvent>;

/** A draft the assistant proposes. Becomes a HealthEvent only on confirmation. */
export const DraftEvent = HealthEvent.partial({
  id: true,
  occurredAt: true,
  recordedAt: true,
  inputMethod: true,
}).extend({ label: z.string().min(1), category: Category });
export type DraftEvent = z.infer<typeof DraftEvent>;

/*
  Passively measured daily data. In a real product this comes from a wearable;
  here it is seeded. Kept separate from HealthEvent because these are continuous
  measurements rather than things the patient chose to report.
*/
export const DailyMetric = z.object({
  date: z.string(), // YYYY-MM-DD
  sleepMinutes: z.number().nullable(),
  restingHeartRate: z.number().nullable(),
  steps: z.number().nullable(),
  painLevel: z.number().min(0).max(10).nullable(),
  fatigueLevel: z.number().min(0).max(10).nullable(),
  cycleDay: z.number().nullable(),
  cyclePhase: CyclePhase.nullable(),
  /**
   * Where the wearable fields (sleep/heart rate/steps) came from. "demo" is
   * Alex's seeded history; "fitbit" is real data synced from the Fitbit
   * account via the Google Health API. Defaulted so rows written before this
   * field existed still parse. Patient-reported fields (painLevel,
   * fatigueLevel) are never sourced from Fitbit regardless of this value.
   */
  source: z.enum(["demo", "fitbit"]).default("demo"),
});
export type DailyMetric = z.infer<typeof DailyMetric>;

export const MetricKey = z.enum([
  "sleepMinutes",
  "restingHeartRate",
  "steps",
  "painLevel",
  "fatigueLevel",
]);
export type MetricKey = z.infer<typeof MetricKey>;

export const BaselineStat = z.object({
  metric: MetricKey,
  mean: z.number(),
  sd: z.number(),
  n: z.number(),
  /** Which comparison group produced this: the same cycle phase, or all days. */
  source: z.enum(["cycle-phase", "all-days"]),
  phase: CyclePhase.nullable(),
});
export type BaselineStat = z.infer<typeof BaselineStat>;

/*
  One metric that has moved away from the patient's own baseline.
  Everything needed to explain the observation is stored here, so
  "Why am I seeing this?" renders the same object that triggered detection —
  the explanation cannot drift from the evidence.
*/
export const TrendSignal = z.object({
  metric: MetricKey,
  baselineValue: z.number(),
  currentValue: z.number(),
  deltaPct: z.number(),
  direction: z.enum(["up", "down"]),
  z: z.number(),
  baselineSource: z.enum(["cycle-phase", "all-days"]),
  phase: CyclePhase.nullable(),
  n: z.number(),
});
export type TrendSignal = z.infer<typeof TrendSignal>;

export const TrendDetection = z.object({
  detectedAt: z.string(),
  windowDays: z.number(),
  /** Only the metrics that crossed both thresholds. */
  signals: z.array(TrendSignal),
  /** Every metric evaluated, including the ones that held steady. */
  evaluated: z.array(TrendSignal),
  /** True only when enough signals moved together to be worth surfacing. */
  triggered: z.boolean(),
  phase: CyclePhase.nullable(),
});
export type TrendDetection = z.infer<typeof TrendDetection>;

/*
  The doctor summary. Section-shaped rather than one blob of prose so the
  patient can remove individual parts before approving, and so clinician mode
  can replay one section aloud on request.
*/
export const SummarySection = z.object({
  id: z.string(),
  heading: z.string(),
  body: z.string(),
  /** Patient can drop a section without deleting it, in case they change their mind. */
  included: z.boolean().default(true),
});
export type SummarySection = z.infer<typeof SummarySection>;

export const DoctorSummary = z.object({
  generatedAt: z.string(),
  sections: z.array(SummarySection),
  approved: z.boolean().default(false),
  approvedAt: z.string().nullable().default(null),
  /** Verbatim patient statements, shown to the doctor alongside the summary. */
  quotedStatements: z.array(
    z.object({ text: z.string(), language: z.string(), when: z.string() }),
  ),
  source: z.enum(["llm", "deterministic"]),
});
export type DoctorSummary = z.infer<typeof DoctorSummary>;

/*
  What the assistant returns each turn. Two possibilities only: ask exactly one
  follow-up question, or propose drafts for confirmation. It can never save.
*/
export const AssistantTurn = z.object({
  action: z.enum(["ask", "propose"]),
  /** Present when action is "ask". Exactly one question, in plain language. */
  question: z.string().nullable().default(null),
  /** A short acknowledgement shown above the question or the proposal. */
  reply: z.string().default(""),
  drafts: z.array(DraftEvent).default([]),
  /** Fields still unknown, for the UI to label as "not recorded". */
  missingFields: z.array(z.string()).default([]),
  detectedLanguage: z.string().default("en"),
  source: z.enum(["llm", "fallback"]).default("fallback"),
});
export type AssistantTurn = z.infer<typeof AssistantTurn>;

/** A doctor question answered strictly from the stored record. */
export const GroundedAnswer = z.object({
  answered: z.boolean(),
  answer: z.string(),
  citedEventIds: z.array(z.string()).default([]),
  source: z.enum(["llm", "fallback"]).default("fallback"),
});
export type GroundedAnswer = z.infer<typeof GroundedAnswer>;

/** A doctor's spoken instruction, rewritten plainly for the patient. */
export const ExplainBack = z.object({
  original: z.string(),
  plain: z.string(),
  translated: z.string().nullable().default(null),
  language: z.string().default("en"),
  source: z.enum(["llm", "fallback"]).default("fallback"),
});
export type ExplainBack = z.infer<typeof ExplainBack>;

export const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  language: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;
