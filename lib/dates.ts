/** YYYY-MM-DD in local time (not UTC — the patient's day is their own day). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function formatDayHeading(key: string): string {
  const today = dateKey(startOfToday());
  const yesterday = dateKey(addDays(startOfToday(), -1));
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  const d = new Date(`${key}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "3 days ago", "today" — used in summaries and spoken output. */
export function relativeDays(iso: string): string {
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const n = Math.round((startOfToday().getTime() - then.getTime()) / 86_400_000);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

export function dateKeyOf(iso: string): string {
  return dateKey(new Date(iso));
}
