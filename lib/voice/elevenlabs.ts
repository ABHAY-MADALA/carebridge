/*
  ElevenLabs, server-side only.

  One voice, everywhere — HealthThread speaking on the patient's behalf, or
  reading their record aloud to a doctor, is still HealthThread, not a second
  persona. `Speaker` is kept as a parameter through this file and its callers
  so the shape doesn't have to change again if a real second voice becomes
  useful later, but it no longer affects which voice is used.
*/

export type Speaker = "patient" | "clinical";

const TTS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

// Stock voice, used when the env var is not set.
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

export function elevenLabsKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key ? key : null;
}

export function voiceIdFor(_speaker: Speaker): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE;
}

/**
 * Streams speech audio. Returns the upstream response body so the route can
 * pass it straight through without buffering the whole clip in memory.
 *
 * eleven_multilingual_v2 is the default because the same endpoint has to speak
 * both the English and the Spanish summary.
 */
export async function synthesize(
  text: string,
  speaker: Speaker,
  signal?: AbortSignal,
): Promise<Response> {
  const key = elevenLabsKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

  const model = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";
  const url = `${TTS_BASE}/${voiceIdFor(speaker)}/stream?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "xi-api-key": key,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        // Steadier than the default: this is health information being read to
        // a clinician, not performance.
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`elevenlabs tts ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res;
}

export type Transcription = { text: string; languageCode: string };

/**
 * Speech to text via Scribe.
 *
 * Using this instead of the browser's SpeechRecognition matters for more than
 * quality: SpeechRecognition is Chrome-only, and a demo whose microphone dies
 * on a Safari laptop is a demo that dies. Scribe also auto-detects the
 * language, which is what lets a Spanish speaker just talk.
 */
export async function transcribe(
  audio: Blob,
  signal?: AbortSignal,
): Promise<Transcription> {
  const key = elevenLabsKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

  const form = new FormData();
  form.append("file", audio, "input.webm");
  form.append("model_id", process.env.ELEVENLABS_STT_MODEL?.trim() || "scribe_v1");
  form.append("tag_audio_events", "false");

  const res = await fetch(STT_URL, {
    method: "POST",
    signal,
    headers: { "xi-api-key": key },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`elevenlabs stt ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as { text?: string; language_code?: string };
  return {
    text: (json.text ?? "").trim(),
    languageCode: json.language_code ?? "en",
  };
}

/**
 * Remaining character quota. Worth checking before presenting: the free tier
 * burns down fast when a summary is replayed during rehearsal.
 */
export async function quota(): Promise<{ used: number; limit: number } | null> {
  const key = elevenLabsKey();
  if (!key) return null;
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      character_count?: number;
      character_limit?: number;
    };
    return { used: json.character_count ?? 0, limit: json.character_limit ?? 0 };
  } catch {
    return null;
  }
}
