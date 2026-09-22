import { NextResponse } from "next/server";
import { z } from "zod";
import { elevenLabsKey, synthesize } from "@/lib/voice/elevenlabs";
import { limitedJson, secureApiRequest } from "@/lib/security/request";

export const runtime = "nodejs";

const Body = z.object({
  text: z.string().min(1).max(5000),
  speaker: z.enum(["patient", "clinical"]).default("patient"),
});

export async function POST(req: Request) {
  const security = secureApiRequest(req, "speech", { limit: 20, windowMs: 60_000 }, { mutation: true });
  if (!security.ok) return security.response;
  let body;
  try {
    body = Body.parse(await limitedJson(req, 24 * 1024));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: security.rateHeaders });
  }

  /*
    204 rather than an error status. "I cannot speak this, you speak it" is a
    normal outcome, not a failure: the client hears 204 and uses the browser's
    own speech engine, so the patient always gets a voice.
  */
  if (!elevenLabsKey()) return new NextResponse(null, { status: 204, headers: security.rateHeaders });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await synthesize(body.text, body.speaker, controller.signal);

    // Passed straight through as a stream so audio starts playing before the
    // whole file has been generated.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
        ...security.rateHeaders,
      },
    });
  } catch (err) {
    console.warn("[carebridge] tts unavailable, client will fall back:", (err as Error).message);
    return new NextResponse(null, { status: 204, headers: security.rateHeaders });
  } finally {
    clearTimeout(timer);
  }
}
