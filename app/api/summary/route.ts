import { NextResponse } from "next/server";
import { z } from "zod";
import { DoctorSummary } from "@/lib/schema";
import { polishSummary } from "@/lib/ai/summarize";

export const runtime = "nodejs";

/*
  The summary arrives already built from the patient's own record. This route
  only offers to reword it. If anything about the rewrite is wrong, the summary
  comes back exactly as it went in.
*/
const Body = z.object({ summary: DoctorSummary });

export async function POST(req: Request) {
  let summary;
  try {
    summary = Body.parse(await req.json()).summary;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await polishSummary(summary));
  } catch (err) {
    console.error("[carebridge] summary route error:", err);
    return NextResponse.json(summary);
  }
}
