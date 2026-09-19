import { NextResponse } from "next/server";
import { z } from "zod";
import { explainBack } from "@/lib/ai/explainBack";

export const runtime = "nodejs";

const Body = z.object({
  text: z.string().min(1).max(3000),
  language: z.string().default("en"),
});

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await explainBack(body.text, body.language));
  } catch (err) {
    console.error("[carebridge] explain-back route error:", err);
    // The doctor's own words are better than nothing, so pass them through.
    return NextResponse.json({
      original: body.text,
      plain: body.text,
      translated: null,
      language: body.language,
      source: "fallback",
    });
  }
}
