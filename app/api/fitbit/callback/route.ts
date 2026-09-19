import { NextResponse } from "next/server";
import { exchangeCode, googleHealthConfig } from "@/lib/health/googleHealth";

export const runtime = "nodejs";

const TOKEN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/*
  Note: if Google's Cloud Console forces a fixed redirect URI for this app
  type (rather than accepting our own /api/fitbit/callback), this route as
  written won't receive the request at all — the fix in that case is a
  "paste your authorization code" input in FitbitConnect.tsx instead of this
  redirect-based callback. Confirmed which shape is real during the
  feasibility check before relying on this route.
*/
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const config = googleHealthConfig();
  const cookieState = getCookie(req, "fitbit_oauth_state");
  const verifier = getCookie(req, "fitbit_pkce_verifier");

  if (!config || !code || !state || !cookieState || !verifier || state !== cookieState) {
    return clearOAuthCookies(NextResponse.redirect(new URL("/?fitbit=error", req.url)));
  }

  try {
    const tokens = await exchangeCode(config, code, verifier);
    const res = clearOAuthCookies(NextResponse.redirect(new URL("/?fitbit=connected", req.url)));
    res.cookies.set("fitbit_access_token", tokens.accessToken, TOKEN_COOKIE_OPTS);
    if (tokens.refreshToken) {
      res.cookies.set("fitbit_refresh_token", tokens.refreshToken, TOKEN_COOKIE_OPTS);
    }
    res.cookies.set("fitbit_token_expiry", String(tokens.expiresAt), TOKEN_COOKIE_OPTS);
    return res;
  } catch (err) {
    console.warn("[carebridge] Fitbit/Google Health token exchange failed:", (err as Error).message);
    return clearOAuthCookies(NextResponse.redirect(new URL("/?fitbit=error", req.url)));
  }
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearOAuthCookies(res: NextResponse): NextResponse {
  res.cookies.set("fitbit_pkce_verifier", "", { ...TOKEN_COOKIE_OPTS, maxAge: 0 });
  res.cookies.set("fitbit_oauth_state", "", { ...TOKEN_COOKIE_OPTS, maxAge: 0 });
  return res;
}
