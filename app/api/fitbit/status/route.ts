import { NextResponse } from "next/server";
import { googleHealthConfig } from "@/lib/health/googleHealth";
import type { HealthSourceStatus } from "@/lib/health/sources";

export const runtime = "nodejs";

/** Cheap, no network call to Google — just "do we have the pieces to try". */
export async function GET(req: Request) {
  const configured = googleHealthConfig() !== null;
  const connected = getCookie(req, "fitbit_access_token") !== null;
  const body: HealthSourceStatus = { configured, connected, lastSyncAt: null };
  return NextResponse.json(body);
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
