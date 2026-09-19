import { z } from "zod";
import { BackendError, type HealthMetric } from "./schema";
import type { GoogleHealthConfig, TokenSet } from "@/lib/health/googleHealth";

// Google Health v4 reference checked 2026-09-19; see docs/backend-profiles.md.
// Sleep is a reconciled session, not a dailyRollUp value. Resting HR rollups
// describe a personal RANGE, not the day's measured resting HR.
const BASE = "https://health.googleapis.com/v4/users/me/dataTypes";
const family = "users/me/dataSourceFamilies/google-wearables";
type Point = Omit<HealthMetric, "userId" | "synthetic">;
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
function number(v: unknown) {
  if (typeof v !== "number" && !(typeof v === "string" && /^\d+(\.\d+)?$/.test(v))) return null;
  const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n : null;
}
function date(v: unknown): string | null {
  const d = record(v);
  if (![d.year,d.month,d.day].every(n => typeof n === "number" && Number.isInteger(n))) return null;
  const result = `${d.year}-${String(d.month).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;
  const parsed = new Date(`${result}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === result ? result : null;
}
const civil = (key: string) => { const [year,month,day] = key.split("-").map(Number); return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0 } }; };
const dayMs = 86400000;

function sleepDay(interval: Record<string, unknown>): string | null {
  const explicit = date(record(interval.civilEndTime).date);
  if (explicit) return explicit;
  // Live session responses can omit civilEndTime. Use the patient's offset at
  // wake-up, never the server's timezone or a guessed UTC day (including DST).
  if (typeof interval.endTime !== "string" || typeof interval.endUtcOffset !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(interval.endTime)
    || !/^-?\d+(?:\.\d{1,9})?s$/.test(interval.endUtcOffset)) return null;
  const [year, month, day] = interval.endTime.slice(0, 10).split("-").map(Number);
  if (!date({ year, month, day })) return null;
  const end = Date.parse(interval.endTime);
  const offset = Number(interval.endUtcOffset.slice(0, -1));
  if (!Number.isFinite(end) || !Number.isFinite(offset) || Math.abs(offset) >= 86400) return null;
  return new Date(end + offset * 1000).toISOString().slice(0, 10);
}

function stepRanges(start: string, end: string): { start: string; end: string }[] {
  const ranges = [];
  // Keep both the query range and page size small. The live provider rejects
  // pageSize 100 and some month-long rollups; civil-date arithmetic avoids DST.
  for (let cursor = start; cursor < end;) {
    const next = new Date(Date.parse(`${cursor}T00:00:00Z`) + 7 * dayMs).toISOString().slice(0, 10);
    const stop = next < end ? next : end;
    ranges.push({ start: cursor, end: stop });
    cursor = stop;
  }
  return ranges;
}

export function normalizeGooglePoints(type: Point["type"], payload: unknown, importedAt: string): Point[] {
  const body = record(payload);
  const rows = type === "steps" ? body.rollupDataPoints : body.dataPoints;
  if (!Array.isArray(rows)) return [];
  const grouped = new Map<string, Point>();
  for (const raw of rows) {
    const p = record(raw);
    const data = record(p[type === "sleepMinutes" ? "sleep" : type === "restingHeartRate" ? "dailyRestingHeartRate" : "steps"]);
    const interval = record(data.interval);
    const day = type === "sleepMinutes" ? sleepDay(interval)
      : type === "restingHeartRate" ? date(data.date) : date(record(p.civilStartTime).date);
    const value = number(type === "sleepMinutes" ? record(data.summary).minutesAsleep : type === "restingHeartRate" ? data.beatsPerMinute : data.countSum);
    if (!day || value === null) continue;
    const current = grouped.get(day);
    // Duplicate daily values are ambiguous; don't add two resting HRs or steps.
    if (current && type !== "sleepMinutes") throw new BackendError(502, "ambiguous-provider-day");
    const providerRecord = { ...(typeof p.dataPointName === "string" ? { id: p.dataPointName } : {}),
      ...(typeof interval.startTime === "string" ? { startTime: interval.startTime } : {}),
      ...(typeof interval.endTime === "string" ? { endTime: interval.endTime } : {}) };
    if (current?.providerRecords?.some(r => r.id && r.id === providerRecord.id)) continue;
    grouped.set(day, { id: `fitbit:${type}:${day}`, type, date: day, value: (current?.value ?? 0) + value,
      unit: type === "sleepMinutes" ? "minutes" : type === "steps" ? "steps" : "bpm",
      timestamp: typeof interval.endTime === "string" ? interval.endTime : day,
      granularity: "day", source: "fitbit", importedAt,
      providerRecords: [...(current?.providerRecords ?? []), providerRecord] });
  }
  return [...grouped.values()];
}

export function fitbitConfig(): GoogleHealthConfig | null {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.CAREBRIDGE_FITBIT_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  try { if (new URL(redirectUri).pathname !== "/api/backend/fitbit/callback") return null; } catch { return null; }
  return { clientId, clientSecret, redirectUri };
}

export interface FitbitProvider {
  exchange(config: GoogleHealthConfig, code: string, verifier: string): Promise<TokenSet>;
  refresh(config: GoogleHealthConfig, refresh: string): Promise<TokenSet>;
  measurements(token: string, start: string, end: string): Promise<{ points: Point[]; unavailable: string[] }>;
}
export const googleFitbitProvider: FitbitProvider = {
  exchange: (c, code, verifier) => token(new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: c.redirectUri, code, code_verifier: verifier, grant_type: "authorization_code" })),
  refresh: async (c, refresh) => { const result = await token(new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: refresh, grant_type: "refresh_token" })); return { ...result, refreshToken: result.refreshToken ?? refresh }; },
  async measurements(accessToken, start, end) {
    const results = await Promise.all((["steps", "sleepMinutes", "restingHeartRate"] as const).map(async type => {
      try {
        const collection = type === "sleepMinutes" ? "sleep" : type === "steps" ? "steps" : "daily-resting-heart-rate";
        const field = type === "sleepMinutes" ? "sleep.interval.civil_end_time" : "daily_resting_heart_rate.date";
        const rows: unknown[] = [];
        const ranges = type === "steps" ? stepRanges(start, end) : [{ start, end }];
        for (const range of ranges) {
          let pageToken = "";
          for (let page = 0; page < 20; page++) {
            const url = new URL(`${BASE}/${collection}/dataPoints:${type === "steps" ? "dailyRollUp" : "reconcile"}`);
            const body = { range: { start: civil(range.start), end: civil(range.end) }, windowSizeDays: 1, pageSize: 7, dataSourceFamily: family, ...(pageToken ? { pageToken } : {}) };
            if (type !== "steps") {
              url.searchParams.set("filter", `${field} >= "${start}" AND ${field} < "${end}"`);
              url.searchParams.set("dataSourceFamily", family); url.searchParams.set("pageSize", "25");
              if (pageToken) url.searchParams.set("pageToken", pageToken);
            }
            const response = await fetch(url, { method: type === "steps" ? "POST" : "GET", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, ...(type === "steps" ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
            if (response.status === 401) throw new BackendError(401, "reauth-required");
            if (!response.ok) throw new BackendError(502, "provider-unavailable");
            const result = record(await response.json());
            const batch = result[type === "steps" ? "rollupDataPoints" : "dataPoints"];
            if (Array.isArray(batch)) rows.push(...batch);
            pageToken = typeof result.nextPageToken === "string" ? result.nextPageToken : "";
            if (!pageToken) break;
            if (page === 19) throw new BackendError(502, "provider-pagination-limit");
          }
        }
        return { type, points: normalizeGooglePoints(type, { [type === "steps" ? "rollupDataPoints" : "dataPoints"]: rows }, new Date().toISOString()).filter(p => p.date >= start && p.date < end) };
      } catch (error) {
        if (error instanceof BackendError && error.status === 401) throw error;
        return { type, points: [], unavailable: true };
      }
    }));
    return { points: results.flatMap(r => r.points), unavailable: results.filter(r => r.unavailable || !r.points.length).map(r => r.type) };
  },
};
async function token(body: URLSearchParams): Promise<TokenSet> {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new BackendError(response.status === 400 ? 401 : 502, "oauth-token-exchange-failed");
  const data = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), expires_in: z.number().positive().finite() }).parse(await response.json());
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresAt: Date.now() + data.expires_in * 1000 };
}
