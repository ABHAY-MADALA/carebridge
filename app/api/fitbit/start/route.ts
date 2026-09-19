import { NextResponse } from "next/server";
import { buildAuthUrl, generatePkce, generateState, googleHealthConfig } from "@/lib/health/googleHealth";

export const runtime = "nodejs";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 600,
  path: "/",
};

/*
  Starts the OAuth+PKCE round trip. Never 500s: a misconfigured app just sends
  the patient back home rather than to a broken external page — FitbitConnect
  shouldn't render a working "Connect" button in that state anyway, but this
  route has to be safe even if it's hit directly.
*/
export async function GET(req: Request) {
  const config = googleHealthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/?fitbit=not-configured", req.url));
  }

  const { verifier, challenge } = generatePkce();
  const state = generateState();

  const res = NextResponse.redirect(buildAuthUrl(config, state, challenge));
  res.cookies.set("fitbit_pkce_verifier", verifier, COOKIE_OPTS);
  res.cookies.set("fitbit_oauth_state", state, COOKIE_OPTS);
  return res;
}
