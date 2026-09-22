import { NextResponse } from "next/server";
import { elevenLabsKey } from "@/lib/voice/elevenlabs";
import { getProvider } from "@/lib/ai/provider";
import { secureApiRequest } from "@/lib/security/request";

export const runtime = "nodejs";

/*
  Lets the client choose its input path BEFORE the patient starts talking.
  Discovering that transcription is unavailable after they have already spoken
  means asking them to say it all again, which is exactly the experience
  HealthThread is supposed to avoid.

  Booleans only — never the keys themselves.
*/
export async function GET(req: Request) {
  const security = secureApiRequest(req, "voice-status", { limit: 120, windowMs: 60_000 });
  if (!security.ok) return security.response;
  const provider = getProvider();
  return NextResponse.json({
    elevenlabs: Boolean(elevenLabsKey()),
    llm: Boolean(provider),
    llmProvider: provider?.name ?? null,
  }, { headers: security.rateHeaders });
}
