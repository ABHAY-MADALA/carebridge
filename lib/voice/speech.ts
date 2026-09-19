"use client";

/*
  Client-side speech.

  Three jobs:
  1. Fetch audio from our ElevenLabs route, falling back to the browser's own
     speech engine on any failure. Speak for Me must never produce silence.
  2. Cache audio by text, and pre-warm it. Clicking "Speak for Me" during the
     most-watched ten seconds of a demo should play instantly, not spin.
  3. Guarantee that only one thing is speaking at a time. Overlapping voices in
     a clinician's office would be worse than useless.
*/

export type Speaker = "patient" | "clinical";
export type Engine = "elevenlabs" | "browser" | "none";

const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/** Set once per session from /api/voice-status, so we don't retry a missing key. */
let elevenLabsAvailable: boolean | null = null;

export async function voiceStatus(): Promise<{ elevenlabs: boolean; llm: boolean }> {
  try {
    const res = await fetch("/api/voice-status");
    const json = await res.json();
    elevenLabsAvailable = Boolean(json.elevenlabs);
    return { elevenlabs: Boolean(json.elevenlabs), llm: Boolean(json.llm) };
  } catch {
    elevenLabsAvailable = false;
    return { elevenlabs: false, llm: false };
  }
}

function cacheKey(text: string, speaker: Speaker) {
  return `${speaker}::${text}`;
}

async function fetchAudioUrl(text: string, speaker: Speaker): Promise<string | null> {
  const key = cacheKey(text, speaker);
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, speaker }),
      });
      /*
        204 means "I cannot speak this, you speak it" — the route's way of
        reporting a missing key, a quota exhaustion, or an upstream error.
        It must be treated as no-audio even though fetch considers 2xx a
        success, or we cache an empty blob and every later attempt at the same
        text fails to decode before falling back.
      */
      if (!res.ok || res.status === 204) {
        elevenLabsAvailable = false;
        return null;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        elevenLabsAvailable = false;
        return null;
      }

      const url = URL.createObjectURL(blob);
      cache.set(key, url);
      elevenLabsAvailable = true;
      return url;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

/**
 * Generate and cache audio ahead of time. Called the moment a summary is
 * approved, so the audio is already sitting in memory when the button is hit.
 */
export function prewarm(text: string, speaker: Speaker = "patient") {
  if (!text.trim() || elevenLabsAvailable === false) return;
  void fetchAudioUrl(text, speaker).catch(() => null);
}

export function isPrewarmed(text: string, speaker: Speaker = "patient") {
  return cache.has(cacheKey(text, speaker));
}

type Active = { audio?: HTMLAudioElement; browser?: boolean };
let active: Active | null = null;
let onStopCallback: (() => void) | null = null;

export function stopSpeaking() {
  if (active?.audio) {
    active.audio.pause();
    active.audio.currentTime = 0;
  }
  if (active?.browser && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  active = null;
  const cb = onStopCallback;
  onStopCallback = null;
  cb?.();
}

export type SpeakOptions = {
  speaker?: Speaker;
  /** 0.6 - 1.4. Some people need it slower; some doctors want it faster. */
  rate?: number;
  lang?: string;
  onEnd?: () => void;
};

/** Resolves with the engine that actually produced sound. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<Engine> {
  const { speaker = "patient", rate = 1, lang = "en", onEnd } = opts;
  if (!text.trim()) return "none";

  stopSpeaking();
  onStopCallback = onEnd ?? null;

  const url = elevenLabsAvailable === false ? null : await fetchAudioUrl(text, speaker);

  if (url) {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    active = { audio };
    audio.onended = () => {
      active = null;
      onStopCallback = null;
      onEnd?.();
    };
    try {
      await audio.play();
      return "elevenlabs";
    } catch {
      // Autoplay refusal or a decode error — fall through to the browser voice.
    }
  }

  return speakWithBrowser(text, { rate, lang, onEnd });
}

function speakWithBrowser(
  text: string,
  { rate = 1, lang = "en", onEnd }: { rate?: number; lang?: string; onEnd?: () => void },
): Engine {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return "none";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.lang = lang === "es" ? "es-ES" : "en-US";
  utterance.onend = () => {
    active = null;
    onStopCallback = null;
    onEnd?.();
  };

  active = { browser: true };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return "browser";
}

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.speechSynthesis) || elevenLabsAvailable !== false;
}
