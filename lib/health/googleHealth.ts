import crypto from "node:crypto";

/*
  OAuth + data access for the Google Health API — the successor to the Fitbit
  Web API (Google shut the legacy API down in September 2026; new
  integrations authorize through Google OAuth 2.0 instead of Fitbit's own
  authorization server). Product-facing copy still says "Fitbit" because
  that's the wearable the patient owns; this file is the only place that
  knows the plumbing is Google's.

  Route handlers (app/api/fitbit/*) are the only callers. Nothing here
  touches the store — see lib/health/fitbitSync.ts for why that merge has to
  happen client-side.
*/

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://health.googleapis.com/v4";

const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
];

export type GoogleHealthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function googleHealthConfig(): GoogleHealthConfig | null {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(crypto.randomBytes(16));
}

export function buildAuthUrl(config: GoogleHealthConfig, state: string, codeChallenge: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
};

async function requestToken(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token endpoint ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export function exchangeCode(config: GoogleHealthConfig, code: string, codeVerifier: string): Promise<TokenSet> {
  return requestToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    }),
  );
}

export async function refreshAccessToken(config: GoogleHealthConfig, refreshToken: string): Promise<TokenSet> {
  const set = await requestToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
  // Google's refresh response omits refresh_token when the original is still valid.
  return { ...set, refreshToken: set.refreshToken ?? refreshToken };
}

/*
  google.type.DateTime-shaped civil date, date-only (no time-of-day) — this is
  a best-effort shape for the dailyRollUp request body. The Google Health API
  reference for CivilDateTime wasn't fully resolvable ahead of having live
  credentials to test against; if a sync call 400s on this shape, that's the
  first thing to fix once real API errors are visible.
*/
function civilDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export type RollupPoint = { date: string; value: number | null };

/**
 * One data type (e.g. "steps"), daily granularity, over [startDate, endDate).
 * Returns an empty array (never throws past its own try/catch) on any
 * per-type failure — a missing/unsupported metric degrades to "omitted",
 * never a fabricated value, and never takes down the rest of a sync.
 */
export async function fetchDailyRollup(
  accessToken: string,
  dataType: string,
  startDate: string,
  endDate: string,
): Promise<RollupPoint[]> {
  try {
    const res = await fetch(`${API_BASE}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        range: { start: civilDate(startDate), end: civilDate(endDate) },
        windowSizeDays: 1,
        pageSize: 100,
      }),
    });
    if (!res.ok) {
      console.warn(`[carebridge] Google Health ${dataType} rollup ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      rollupDataPoints?: { civilStartTime?: { year: number; month: number; day: number }; value?: Record<string, unknown> }[];
    };
    return (json.rollupDataPoints ?? []).map((p) => {
      const t = p.civilStartTime;
      const date = t ? `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}` : "";
      const raw = p.value ? Object.values(p.value)[0] : null;
      const value = typeof raw === "number" ? raw : null;
      return { date, value };
    }).filter((p) => p.date);
  } catch (err) {
    console.warn(`[carebridge] Google Health ${dataType} rollup failed:`, (err as Error).message);
    return [];
  }
}
