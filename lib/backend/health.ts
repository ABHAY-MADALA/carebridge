import type { DailyMetric } from "@/lib/schema";
import { computeBaseline } from "@/lib/health/baseline";
import { detectTrend } from "@/lib/health/trends";
import { buildSummary, summaryToText } from "@/lib/health/summary";
import { fallbackAnswer, answerFromRecord } from "@/lib/ai/grounded";
import { fallbackTurn } from "@/lib/ai/fallback";
import { runAssistantTurn } from "@/lib/ai/assistant";
import { polishSummary } from "@/lib/ai/summarize";
import { ProfileStore } from "./store";
import { BackendError } from "./schema";

export function healthSnapshot(store: ProfileStore) {
  const events = store.events();
  const daily = store.daily();
  // The existing math engines never inspect `source`; the wider backend source
  // vocabulary adds patient-reported daily aggregates without relabeling them.
  const engineRows = daily as unknown as DailyMetric[];
  const detection = detectTrend(engineRows);
  const baseline = computeBaseline(engineRows, detection.phase, new Set(daily.slice(-detection.windowDays).map(m => m.date)));
  const missing = Object.entries(baseline).filter(([,stat]) => !stat).map(([key]) => key);
  return {
    userId: store.userId, synthetic: store.userId === "alex-demo", events, metrics: store.metrics(), daily,
    detection: { ...detection, userId: store.userId },
    baseline: { userId: store.userId, values: baseline, missingMetrics: missing,
      status: missing.length ? "building" : "ready",
      message: missing.length ? "Building your baseline" : "Your personal baseline",
      explanation: missing.length ? "Some measurements do not yet have enough of your own history for comparison. No demo data or population averages are substituted." : null },
  };
}

/** Only accepts a bound repository, never a caller-supplied array or detection. */
export function aiContext(store: ProfileStore) {
  const snapshot = healthSnapshot(store);
  return { userId: store.userId, events: snapshot.events, metrics: snapshot.daily as unknown as DailyMetric[], detection: snapshot.detection };
}
export function generateSummary(store: ProfileStore) {
  const ctx = aiContext(store);
  if (ctx.events.length === 0 && ctx.metrics.length === 0) {
    throw new BackendError(409, "summary-source-records-required");
  }
  return { ...buildSummary(ctx.events, ctx.metrics, ctx.detection), userId: store.userId, synthetic: store.userId === "alex-demo" };
}
export async function generateSummaryForProfile(store: ProfileStore) {
  const deterministic = generateSummary(store);
  // Alex remains fully deterministic/offline. Personal must explicitly opt in.
  if (store.userId !== "personal" || !store.settings().allowExternalAI) {
    return deterministic;
  }
  const polished = await polishSummary(deterministic);
  return { ...polished, userId: store.userId, synthetic: false };
}
export function timeline(store: ProfileStore) {
  return [
    ...store.events().map(event => ({ userId: store.userId, kind: "event" as const, timestamp: event.occurredAt, source: event.synthetic ? "Patient reported · Demo" : "Patient reported", event })),
    ...store.daily().filter(row => row.source !== "patient").map(daily => ({ userId: store.userId, kind: "daily" as const, timestamp: daily.date, source: daily.synthetic ? "Synthetic wearable data" : "Fitbit", daily })),
  ].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
}
export async function ask(store: ProfileStore, question: string) {
  const context = aiContext(store);
  // Alex must always work offline, even when the host has provider keys.
  const answer = store.userId === "personal" && store.settings().allowExternalAI
    ? await answerFromRecord(question, context).catch(() => fallbackAnswer(question, context))
    : fallbackAnswer(question, context);
  return { ...answer, userId: store.userId };
}
export async function assistant(store: ProfileStore, conversationId: string, text: string) {
  const history = store.conversation(conversationId);
  if (history.length >= 40) throw new BackendError(400, "conversation-full-start-new");
  const messages = [...history, { role: "user" as const, content: text }];
  const turn = store.userId === "personal" && store.settings().allowExternalAI
    ? await runAssistantTurn(messages).catch(() => fallbackTurn(messages)) : fallbackTurn(messages);
  return { turn, messages: [...messages, { role: "assistant" as const, content: turn.question ?? turn.reply }] };
}
export function approvedSpeech(store: ProfileStore, sectionId?: string) {
  const summary = store.summary();
  if (!summary?.approved) throw new BackendError(409, "summary-approval-required");
  if (!sectionId) return summaryToText(summary, { intro: true });
  const section = summary.sections.find(s => s.id === sectionId && s.included);
  if (!section) throw new BackendError(404, "section-not-found");
  return `${section.heading}. ${section.body.replace(/^- /gm, "")}`;
}
