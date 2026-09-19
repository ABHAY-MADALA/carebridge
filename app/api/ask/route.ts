import { NextResponse } from "next/server";

/** Retired: doctor Q&A loads owned context at /api/backend/ask. */
export async function POST() {
  return NextResponse.json(
    { error: "legacy-unscoped-endpoint-retired" },
    { status: 410 },
  );
}
