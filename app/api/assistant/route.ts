import { NextResponse } from "next/server";

/** Retired: intake is profile-scoped at /api/backend/assistant. */
export async function POST() {
  return NextResponse.json(
    { error: "legacy-unscoped-endpoint-retired" },
    { status: 410 },
  );
}
