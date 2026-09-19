import type { HealthEvent } from "@/lib/schema";

// Compare local calendar days, not elapsed 24-hour periods (DST safe).
const day = (iso: string) => {
  const d = new Date(iso);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
};
const ago = (n: number) => n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

/** Resolve explicit relative dates without turning vague onset into a date. */
function offsetFor(onset: string): number | null {
  if (/^(today|right now)$/.test(onset)) return 0;
  if (onset === "yesterday") return 1;
  const match = onset.match(/^(?:about |approximately |around )?(\d+|a|an|one|two|three|four|five|six|seven) (day|week)s? ago$/);
  return match ? (words[match[1]] ?? Number(match[1])) * (match[2] === "week" ? 7 : 1) : null;
}

/** At most two patient-voice sentences. Statement dates anchor relative onset;
 * occurrence dates establish earlier symptoms; recording dates indicate entry.
 * None establishes a continuous episode. */
export function describeOnset(events: HealthEvent[], now = new Date(), label = events[0]?.label): string {
  const today = day(now.toISOString());
  const subject = label ? `the ${label.charAt(0).toLowerCase()}${label.slice(1)}` : "it";
  const known = events.filter(e => Number.isFinite(day(e.recordedAt)) && new Date(e.recordedAt) <= now);
  const timeline = known.filter(e => Number.isFinite(day(e.occurredAt)) && new Date(e.occurredAt) <= now);
  const stated = [...events]
    .filter(e => e.onset?.trim() && (!Number.isFinite(day(e.recordedAt)) || new Date(e.recordedAt) <= now))
    .sort((a,b) => (Number.isFinite(day(b.recordedAt)) ? new Date(b.recordedAt).getTime() : -Infinity) - (Number.isFinite(day(a.recordedAt)) ? new Date(a.recordedAt).getTime() : -Infinity))[0];
  if (!stated) {
    const records = known.map(e => day(e.recordedAt));
    return records.length ? `I first recorded related symptoms ${ago(today - Math.min(...records))}.` : "I’m not sure when it started.";
  }
  const raw = stated.onset!.trim().replace(/[.!?]+$/, "");
  const onset = raw.toLowerCase();
  if (/^(unknown|not sure|i(?:'|’)m not sure|i don(?:'|’)t know)$/.test(onset)) {
    return describeOnset(events.map(e => ({ ...e, onset: null })), now, label);
  }
  const statedDay = day(stated.recordedAt);
  const offset = offsetFor(onset);
  const approximate = /^(about|approximately|around|a few|over|more than|less than)\b/.test(onset);
  if (offset === null || !Number.isFinite(statedDay)) {
    // Do not silently anchor an undated or old vague statement to today.
    if (approximate && statedDay === today && raw.length <= 60 && !/[.!?]/.test(raw)) return `I said ${subject} started ${onset}.`;
    if (raw.length <= 60 && !/[.!?]/.test(raw)) return `I described the start as “${raw}” at the time.`;
    return "I’m not sure when it started.";
  }
  const start = statedDay - offset;
  const elapsed = today - start;
  const date = approximate
    ? (statedDay === today ? onset : `about ${elapsed} ${elapsed === 1 ? "day" : "days"} ago`)
    : ago(elapsed);
  // Approximate onset is never promoted to an exact match or conflict.
  if (approximate) return `I said ${subject} started ${date}.`;
  const earliest = timeline.length ? Math.min(...timeline.map(e => day(e.occurredAt))) : null;
  if (earliest !== null && earliest < start) {
    const earlier = timeline.filter(e => day(e.occurredAt) < start);
    const firstEntered = Math.min(...earlier.map(e => day(e.recordedAt)));
    const days = today - earliest;
    // A backfilled entry was not necessarily recorded on its occurrence date.
    const evidence = firstEntered === earliest
      ? (days === 1 ? "during the previous day" : `during the previous ${days} days`)
      : `from ${ago(days)}`;
    return `I said ${subject} started ${date}. I also recorded related symptoms ${evidence}.`;
  }
  if (earliest === start) return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} started ${date}.`;
  return `I said ${subject} started ${date}.`;
}
