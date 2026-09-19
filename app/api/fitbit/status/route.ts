import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "legacy-unscoped-endpoint-retired" },
    { status: 410 },
  );
}
