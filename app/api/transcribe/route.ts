import { NextResponse } from "next/server";
import { transcribe } from "@/lib/voice/elevenlabs";
import { secureApiRequest } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const security = secureApiRequest(req, "transcribe", { limit: 10, windowMs: 5 * 60_000 }, { mutation: true });
  if (!security.ok) return security.response;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio is too large" }, { status: 413, headers: security.rateHeaders });
  }
  let file: Blob | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof Blob) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: security.rateHeaders });
  }

  if (!file || file.size === 0 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: file?.size ? "Audio is too large" : "No audio received" }, { status: file?.size ? 413 : 400, headers: security.rateHeaders });
  }

  const result = await transcribe(file);

  // 204 tells the client to fall back to browser speech recognition.
  if (!result) return new NextResponse(null, { status: 204, headers: security.rateHeaders });

  return NextResponse.json(result, { headers: security.rateHeaders });
}
