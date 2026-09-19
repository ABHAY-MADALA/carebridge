import { NextResponse } from "next/server";
import { elevenLabsKey } from "@/lib/voice/elevenlabs";
import { getProvider } from "@/lib/ai/provider";

export const runtime = "nodejs";

/*
  Lets the client choose its input path BEFORE the patient starts talking.
  Discovering that transcription is unavailable after they have already spoken
  means asking them to say it all again, which is exactly the experience
  CareBridge is supposed to avoid.

  Booleans only — never the keys themselves.
*/
export async function GET() {
  const provider = getProvider();
  return NextResponse.json({
    elevenlabs: Boolean(elevenLabsKey()),
    llm: Boolean(provider),
    llmProvider: provider?.name ?? null,
  });
}
