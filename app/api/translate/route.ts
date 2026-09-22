import { NextResponse } from "next/server";
import { z } from "zod";
import { translateToEnglish } from "@/lib/ai/translate";
import { limitedJson, secureApiRequest } from "@/lib/security/request";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().min(1).max(4000) }).strict();

export async function POST(req: Request) {
  const security = secureApiRequest(req, "translate", { limit: 30, windowMs: 60_000 }, { mutation: true });
  if (!security.ok) return security.response;
  let text: string;
  try {
    text = Body.parse(await limitedJson(req, 16 * 1024)).text;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: security.rateHeaders });
  }

  try {
    return NextResponse.json(await translateToEnglish(text), { headers: security.rateHeaders });
  } catch (err) {
    console.error("[carebridge] translate route error:", err);
    return NextResponse.json({
      original: text,
      english: text,
      detectedLanguage: "en",
      source: "fallback",
    }, { headers: security.rateHeaders });
  }
}
