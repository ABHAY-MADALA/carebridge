import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLEAR_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};

/** Clears the token cookies. Never touches localStorage — see fitbitSync.ts. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("fitbit_access_token", "", CLEAR_OPTS);
  res.cookies.set("fitbit_refresh_token", "", CLEAR_OPTS);
  res.cookies.set("fitbit_token_expiry", "", CLEAR_OPTS);
  return res;
}
