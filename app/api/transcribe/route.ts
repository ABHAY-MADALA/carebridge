import { NextResponse } from "next/server";
import { transcribe } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let file: Blob | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof Blob) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }

  const result = await transcribe(file);

  // 204 tells the client to fall back to browser speech recognition.
  if (!result) return new NextResponse(null, { status: 204 });

  return NextResponse.json(result);
}
