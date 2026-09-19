import { NextResponse } from "next/server";
import { dateKey, addDays, startOfToday } from "@/lib/dates";
import { fetchDailyRollup, googleHealthConfig, refreshAccessToken, type RollupPoint } from "@/lib/health/googleHealth";

export const runtime = "nodejs";

const TOKEN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type FitbitSyncRow = {
  date: string;
  sleepMinutes: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

/*
  Pure Fitbit/Google-Health-API proxy: fetches the last 30 days of sleep,
  steps, and resting heart rate and hands back normalized rows. This route
  never touches localStorage — LocalRepository only works in the browser, so
  the actual merge-and-save happens client-side in lib/health/fitbitSync.ts.
  Each of the three metrics is fetched independently; one failing doesn't
  fail the others (same graceful-degrade convention as /api/assistant).
*/
export async function POST(req: Request) {
  const config = googleHealthConfig();
  if (!config) {
    return NextResponse.json({ ok: false, metricsCount: 0, reason: "not-configured" });
  }

  const accessTokenCookie = getCookie(req, "fitbit_access_token");
  const refreshTokenCookie = getCookie(req, "fitbit_refresh_token");
  const expiryCookie = getCookie(req, "fitbit_token_expiry");

  if (!accessTokenCookie || !refreshTokenCookie) {
    return NextResponse.json({ ok: false, metricsCount: 0, reason: "not-connected" });
  }

  let accessToken = accessTokenCookie;
  let refreshedCookies: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

  const expired = !expiryCookie || Date.now() > Number(expiryCookie);
  if (expired) {
    try {
      const tokens = await refreshAccessToken(config, refreshTokenCookie);
      accessToken = tokens.accessToken;
      refreshedCookies = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? refreshTokenCookie,
        expiresAt: tokens.expiresAt,
      };
    } catch (err) {
      console.warn("[carebridge] Fitbit/Google Health refresh failed:", (err as Error).message);
      const res = NextResponse.json({ ok: false, metricsCount: 0, reason: "reauth-required" });
      res.cookies.set("fitbit_access_token", "", { ...TOKEN_COOKIE_OPTS, maxAge: 0 });
      res.cookies.set("fitbit_refresh_token", "", { ...TOKEN_COOKIE_OPTS, maxAge: 0 });
      res.cookies.set("fitbit_token_expiry", "", { ...TOKEN_COOKIE_OPTS, maxAge: 0 });
      return res;
    }
  }

  const end = startOfToday();
  const start = addDays(end, -30);
  const startKey = dateKey(start);
  const endKey = dateKey(addDays(end, 1)); // dailyRollUp range end is exclusive

  const [sleep, steps, restingHr] = await Promise.all([
    fetchDailyRollup(accessToken, "sleep", startKey, endKey),
    fetchDailyRollup(accessToken, "steps", startKey, endKey),
    fetchDailyRollup(accessToken, "daily-resting-heart-rate", startKey, endKey),
  ]);

  if (sleep.length === 0 && steps.length === 0 && restingHr.length === 0) {
    const res = NextResponse.json({ ok: false, metricsCount: 0, reason: "sync-failed" });
    return refreshedCookies ? withRefreshedCookies(res, refreshedCookies) : res;
  }

  const byDate = new Map<string, FitbitSyncRow>();
  const upsert = (points: RollupPoint[], field: keyof Omit<FitbitSyncRow, "date">) => {
    for (const p of points) {
      const row = byDate.get(p.date) ?? { date: p.date, sleepMinutes: null, restingHeartRate: null, steps: null };
      row[field] = p.value;
      byDate.set(p.date, row);
    }
  };
  upsert(sleep, "sleepMinutes");
  upsert(steps, "steps");
  upsert(restingHr, "restingHeartRate");

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const res = NextResponse.json({
    ok: true,
    rows,
    metricsCount: rows.length,
    lastSyncAt: new Date().toISOString(),
  });
  return refreshedCookies ? withRefreshedCookies(res, refreshedCookies) : res;
}

function withRefreshedCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresAt: number },
): NextResponse {
  res.cookies.set("fitbit_access_token", tokens.accessToken, TOKEN_COOKIE_OPTS);
  res.cookies.set("fitbit_refresh_token", tokens.refreshToken, TOKEN_COOKIE_OPTS);
  res.cookies.set("fitbit_token_expiry", String(tokens.expiresAt), TOKEN_COOKIE_OPTS);
  return res;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
