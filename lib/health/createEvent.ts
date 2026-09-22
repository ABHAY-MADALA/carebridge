import { HealthEvent, type DailyMetric, type DraftEvent, type InputMethod } from "@/lib/schema";
import { dateKey } from "@/lib/dates";

/*
  The one place a confirmed draft becomes a real health event.

  Every input path goes through here — the assistant, the body map, the plain
  forms — which is what makes "everything speaks the same internal language"
  true rather than aspirational.
*/

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `evt-${crypto.randomUUID()}`;
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function draftToEvent(
  draft: DraftEvent,
  inputMethod: InputMethod,
  metrics: DailyMetric[],
  occurredAt: Date = new Date(),
): HealthEvent {
  const suppliedDate = draft.occurredAt ? new Date(draft.occurredAt) : null;
  const eventDate = suppliedDate && Number.isFinite(suppliedDate.getTime()) && suppliedDate <= occurredAt
    ? suppliedDate
    : occurredAt;
  const iso = eventDate.toISOString();
  const key = dateKey(eventDate);

  // Cycle context comes from the record for that day, never from the model.
  const day = metrics.find((m) => m.date === key);

  return HealthEvent.parse({
    id: newId(),
    occurredAt: iso,
    recordedAt: new Date().toISOString(),
    category: draft.category,
    label: draft.label,
    severity: draft.severity ?? null,
    bodyLocation: draft.bodyLocation ?? null,
    onset: draft.onset ?? null,
    pattern: draft.pattern ?? null,
    trendHint: draft.trendHint ?? null,
    durationMinutes: draft.durationMinutes ?? null,
    cycleDay: day?.cycleDay ?? null,
    cyclePhase: day?.cyclePhase ?? null,
    originalInput: draft.originalInput ?? "",
    inputLanguage: draft.inputLanguage ?? "en",
    translation: draft.translation ?? null,
    inputMethod,
    note: draft.note ?? null,
  });
}
