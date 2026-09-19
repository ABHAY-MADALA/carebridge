import { NextResponse } from "next/server";

/** Retired: summaries are built from owned records at /api/backend/summary/*. */
export async function POST() {
  return NextResponse.json(
    { error: "legacy-unscoped-endpoint-retired" },
    { status: 410 },
  );
}
