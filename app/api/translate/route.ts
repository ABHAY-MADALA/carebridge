import { NextResponse } from "next/server";
import { z } from "zod";
import { translateToEnglish } from "@/lib/ai/translate";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().min(1) });

export async function POST(req: Request) {
  let text: string;
  try {
    text = Body.parse(await req.json()).text;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await translateToEnglish(text));
  } catch (err) {
    console.error("[carebridge] translate route error:", err);
    return NextResponse.json({
      original: text,
      english: text,
      detectedLanguage: "en",
      source: "fallback",
    });
  }
}
