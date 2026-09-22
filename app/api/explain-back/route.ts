import { NextResponse } from "next/server";
import { z } from "zod";
import { explainBack } from "@/lib/ai/explainBack";
import { limitedJson, secureApiRequest } from "@/lib/security/request";

export const runtime = "nodejs";

const Body = z.object({
  text: z.string().min(1).max(3000),
  language: z.string().default("en"),
});

export async function POST(req: Request) {
  const security = secureApiRequest(req, "explain-back", { limit: 20, windowMs: 60_000 }, { mutation: true });
  if (!security.ok) return security.response;
  let body;
  try {
    body = Body.parse(await limitedJson(req, 16 * 1024));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: security.rateHeaders });
  }

  try {
    return NextResponse.json(await explainBack(body.text, body.language), { headers: security.rateHeaders });
  } catch (err) {
    console.error("[carebridge] explain-back route error:", err);
    // The doctor's own words are better than nothing, so pass them through.
    return NextResponse.json({
      original: body.text,
      plain: body.text,
      translated: null,
      language: body.language,
      source: "fallback",
    }, { headers: security.rateHeaders });
  }
}
