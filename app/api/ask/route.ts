import { NextResponse } from "next/server";
import { z } from "zod";
import { DailyMetric, HealthEvent, TrendDetection } from "@/lib/schema";
import { answerFromRecord, fallbackAnswer } from "@/lib/ai/grounded";

export const runtime = "nodejs";

/*
  The record is sent up with the question because it lives in the browser. That
  is a consequence of the local-first storage choice; when this moves to a
  database the route will read the record itself and the client will send only
  the question.
*/
const Body = z.object({
  question: z.string().min(1).max(500),
  events: z.array(HealthEvent).max(200),
  metrics: z.array(DailyMetric).max(400),
  detection: TrendDetection.nullable().default(null),
});

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ctx = {
    events: body.events,
    metrics: body.metrics,
    detection: body.detection,
  };

  try {
    return NextResponse.json(await answerFromRecord(body.question, ctx));
  } catch (err) {
    console.error("[carebridge] ask route error:", err);
    return NextResponse.json(fallbackAnswer(body.question, ctx));
  }
}
