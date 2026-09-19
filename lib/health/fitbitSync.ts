import { repository } from "@/lib/store";
import type { DailyMetric } from "@/lib/schema";
import type { HealthSourceSyncResult } from "@/lib/health/sources";
import type { FitbitSyncRow } from "@/app/api/fitbit/sync/route";

/*
  /api/fitbit/sync is a pure Fitbit/Google-Health-API proxy — it can't write
  to the store itself because LocalRepository only works in the browser
  (window.localStorage), and route handlers run in the Node runtime. So the
  actual read-merge-write happens here, client-side, exactly where every
  other store write in the app already happens.

  Only sleepMinutes/restingHeartRate/steps are ever overlaid, and only for
  days a real value came back — painLevel/fatigueLevel (patient-reported) and
  cycleDay/cyclePhase are always carried over from whatever was already
  there. A day with no matching Fitbit row is left completely untouched, so
  Alex's demo history (source: "demo") is never overwritten by this.
*/
export async function syncFitbit(): Promise<HealthSourceSyncResult> {
  const res = await fetch("/api/fitbit/sync", { method: "POST" });
  const data = (await res.json()) as
    | { ok: true; rows: FitbitSyncRow[]; metricsCount: number; lastSyncAt: string }
    | { ok: false; metricsCount: number; reason: HealthSourceSyncResult["reason"] };

  if (!data.ok || data.rows.length === 0) {
    return { ok: data.ok, metricsCount: 0, reason: "reason" in data ? data.reason : undefined };
  }

  const existing = await repository.listMetrics();
  const byDate = new Map(existing.map((m) => [m.date, m]));

  for (const row of data.rows) {
    const current = byDate.get(row.date);
    const merged: DailyMetric = {
      date: row.date,
      sleepMinutes: row.sleepMinutes ?? current?.sleepMinutes ?? null,
      restingHeartRate: row.restingHeartRate ?? current?.restingHeartRate ?? null,
      steps: row.steps ?? current?.steps ?? null,
      painLevel: current?.painLevel ?? null,
      fatigueLevel: current?.fatigueLevel ?? null,
      cycleDay: current?.cycleDay ?? null,
      cyclePhase: current?.cyclePhase ?? null,
      source: "fitbit",
    };
    byDate.set(row.date, merged);
  }

  const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  await repository.putMetrics(merged);

  return { ok: true, metricsCount: data.metricsCount };
}
