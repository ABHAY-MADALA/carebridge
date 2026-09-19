import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatMessage } from "@/lib/schema";
import { runAssistantTurn } from "@/lib/ai/assistant";
import { fallbackTurn } from "@/lib/ai/fallback";

// Node runtime: the provider adapters read process.env, which must stay server-side.
export const runtime = "nodejs";

const Body = z.object({ messages: z.array(ChatMessage).min(1) });

export async function POST(req: Request) {
  let messages;
  try {
    messages = Body.parse(await req.json()).messages;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runAssistantTurn(messages));
  } catch (err) {
    // An unexpected server error must still leave the patient with a working
    // assistant, so answer with the deterministic turn rather than a 500.
    console.error("[carebridge] assistant route error:", err);
    return NextResponse.json(fallbackTurn(messages));
  }
}
