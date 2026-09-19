import {
  DoctorSummary,
  type DailyMetric,
  type HealthEvent,
  type SummarySection,
  type TrendDetection,
} from "@/lib/schema";
import { METRICS } from "./metrics";
import { describeOnset } from "./onset";

/*
  The doctor summary, assembled from the record.

  Built deterministically here, from the patient's own events and the same
  TrendDetection object that produced the change banner. A language model may
  later be asked to make the wording warmer, but it is never the source of a
  fact, a number or a date — see lib/ai/summarize.ts.

  Written in the first person so the same text works read on screen and spoken
  aloud by Speak for Me.
*/

const RECENT_DAYS = 7;
const SYMPTOM_CATEGORIES = new Set(["pain", "illness", "fatigue", "sleep", "food", "mood"]);

function recentEvents(events: HealthEvent[], days = RECENT_DAYS, now = new Date()): HealthEvent[] {
  const cutoff = now.getTime() - days * 86_400_000;
  return events
    .filter((e) => new Date(e.occurredAt).getTime() >= cutoff)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

type Ranked = { label: string; count: number; maxSeverity: number; earliest: string; worsening: boolean };

function rankSymptoms(events: HealthEvent[]): Ranked[] {
  const groups = new Map<string, Ranked>();

  for (const e of events) {
    if (!SYMPTOM_CATEGORIES.has(e.category)) continue;
    const g = groups.get(e.label) ?? {
      label: e.label,
      count: 0,
      maxSeverity: 0,
      earliest: e.occurredAt,
      worsening: false,
    };
    g.count += 1;
    g.maxSeverity = Math.max(g.maxSeverity, e.severity ?? 0);
    if (e.occurredAt < g.earliest) g.earliest = e.occurredAt;
    if (e.trendHint === "worse") g.worsening = true;
    groups.set(e.label, g);
  }

  // Strength first, then how often it came up: a 7/10 mentioned once matters
  // more than a 2/10 mentioned five times.
  return [...groups.values()].sort(
    (a, b) => b.maxSeverity - a.maxSeverity || b.count - a.count,
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function buildSummary(
  events: HealthEvent[],
  metrics: DailyMetric[],
  detection: TrendDetection | null,
  now = new Date(),
): DoctorSummary {
  const recent = recentEvents(events, RECENT_DAYS, now);
  const ranked = rankSymptoms(recent);
  const sections: SummarySection[] = [];

  // --- Main concern -------------------------------------------------------
  const top = ranked.slice(0, 2);
  if (top.length) {
    const worsening = top.some((t) => t.worsening);
    const names = joinList(top.map((t) => lowerFirst(t.label)));
    sections.push({
      id: "concern",
      heading: "My main concern",
      body: worsening
        ? `I have had ${names}, and it has been getting worse.`
        : `I have had ${names}.`,
      included: true,
    });
  }

  // --- When it started ---------------------------------------------------
  if (top.length) {
    sections.push({
      id: "started",
      heading: "When it started",
      body: describeOnset(events.filter(e => e.label === top[0].label), now, top[0].label),
      included: true,
    });
  }

  // --- What has changed --------------------------------------------------
  if (detection?.signals.length) {
    const lines = detection.signals.map((s) => {
      const meta = METRICS[s.metric];
      return `${meta.phrase(s.baselineValue, s.currentValue)}.`;
    });
    sections.push({
      id: "changes",
      heading: "What has changed",
      body: `Compared with my own usual pattern over the last ${detection.windowDays} days:\n${lines
        .map((l) => `- ${l}`)
        .join("\n")}`,
      included: true,
    });
  }

  // --- Everything I reported --------------------------------------------
  if (ranked.length) {
    const lines = ranked.map((r) => {
      const bits: string[] = [];
      if (r.maxSeverity) bits.push(`up to ${r.maxSeverity} out of 10`);
      if (r.count > 1) bits.push(`recorded ${r.count} times`);
      return `- ${r.label}${bits.length ? ` (${bits.join(", ")})` : ""}`;
    });
    sections.push({
      id: "symptoms",
      heading: "What I have recorded",
      body: `In the last ${RECENT_DAYS} days:\n${lines.join("\n")}`,
      included: true,
    });
  }

  // --- Pattern -----------------------------------------------------------
  if (detection?.triggered) {
    const phaseAware = detection.signals[0]?.baselineSource === "cycle-phase";
    sections.push({
      id: "pattern",
      heading: "The pattern I am seeing",
      body: phaseAware
        ? `${detection.signals.length} of my measurements moved away from my usual pattern at the same time. The comparison uses the same ${detection.phase} phase of my previous cycles, not a simple monthly average, because some of my symptoms normally change through my cycle.`
        : `${detection.signals.length} of my measurements moved away from my usual pattern at the same time, compared with my own earlier days.`,
      included: true,
    });
  }

  /*
    Verbatim statements. These go to the doctor unedited and untranslated
    alongside the summary: the patient's own words are the primary record, and
    anything we assembled from them is secondary.
  */
  const quoted = recent
    .filter((e) => e.originalInput.trim().length > 0)
    .slice(0, 6)
    .map((e) => ({
      text: e.originalInput,
      language: e.inputLanguage,
      when: e.occurredAt,
    }));

  return DoctorSummary.parse({
    generatedAt: now.toISOString(),
    sections,
    approved: false,
    approvedAt: null,
    quotedStatements: quoted,
    source: "deterministic",
  });
}

/** Display-only correction of the exact legacy generated template. No storage
 * migration; patient edits and all other approved sections remain untouched.
 * Anchor to generation time so an old summary never shifts its relative dates. */
export function summaryForDisplay(summary: DoctorSummary | null, events: HealthEvent[]): DoctorSummary | null {
  // Recognize only retired generated templates, not arbitrary patient edits.
  const retired = (body: string) => /^It started .+ — about .+ by my records\.$/.test(body)
    || /^[^\n:]+: (?:I said it started [^.]+\.(?: I first recorded it [^.]+\.)?|I said it started [^.]+, although related symptoms appear in my timeline from [^.]+\. I first recorded them [^.]+\.|I first recorded it [^.]+\. The start date is not recorded\.)(?: Related entries span \d+ days; they do not establish that symptoms were continuous\.)?$/.test(body);
  if (!summary || !summary.sections.some(s => s.id === "started" && retired(s.body))) return summary;
  const started = buildSummary(events.filter(e => e.recordedAt <= summary.generatedAt), [], null, new Date(summary.generatedAt)).sections.find(s => s.id === "started");
  if (!started) return summary;
  return { ...summary, sections: summary.sections.map(s => s.id === "started" && retired(s.body) ? { ...s, body: started.body } : s) };
}

/** One readable block, used for Speak for Me and the clinician view. */
export function summaryToText(summary: DoctorSummary, opts: { intro?: boolean } = {}): string {
  const parts: string[] = [];

  if (opts.intro) {
    parts.push(
      "Hello. I use CareBridge to help me communicate my health information. Here is what has been happening.",
    );
  }

  for (const s of summary.sections.filter((x) => x.included)) {
    // Bullet markers are for the eye; spoken aloud they become noise.
    parts.push(`${s.heading}. ${s.body.replace(/^- /gm, "").replace(/\n/g, " ")}`);
  }

  parts.push(
    "This information was recorded by me over time and organized by CareBridge. It is not a diagnosis.",
  );

  return parts.join("\n\n");
}
