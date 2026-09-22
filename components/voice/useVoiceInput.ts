"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { voiceStatus } from "@/lib/voice/speech";

/*
  Microphone input.

  Primary path is ElevenLabs Scribe via /api/transcribe: it works in every
  browser and detects the spoken language by itself, so a Spanish speaker just
  talks. The browser's SpeechRecognition is the fallback, and it is only a
  fallback — it exists in Chrome and not much else.

  Capability is checked on mount rather than on first use, because finding out
  that transcription is unavailable AFTER someone has spoken means asking them
  to repeat themselves.
*/

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function browserRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export type VoiceResult = { text: string; languageCode: string };

export function useVoiceInput({
  onResult,
  lang = "en",
}: {
  onResult: (r: VoiceResult) => void;
  lang?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<"elevenlabs" | "browser" | "none">("none");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const useScribe = useRef<boolean | null>(null);
  const active = useRef(true);
  const transcription = useRef<AbortController | null>(null);

  useEffect(() => {
    voiceStatus().then((s) => {
      useScribe.current = s.elevenlabs;
      const canRecord =
        typeof window !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined";
      if (s.elevenlabs && canRecord) setEngine("elevenlabs");
      else if (browserRecognition()) setEngine("browser");
      else setEngine("none");
    });
  }, []);

  const sendForTranscription = useCallback(
    async (blob: Blob) => {
      if (!active.current) return;
      const controller = new AbortController();
      transcription.current = controller;
      setTranscribing(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("audio", blob, "input.webm");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "x-carebridge-request": "1" },
          body: form,
          signal: controller.signal,
        });
        if (!active.current) return;

        /*
          204 is the route's way of saying "transcription is unavailable, use
          your own engine". fetch treats it as a success, so it has to be
          checked explicitly — otherwise reading the empty body throws and the
          patient gets a generic error while the hook keeps retrying a service
          that is not coming back.
        */
        if (res.status === 204 || res.status === 503) {
          useScribe.current = false;
          const canUseBrowser = Boolean(browserRecognition());
          setEngine(canUseBrowser ? "browser" : "none");
          setError(
            canUseBrowser
              ? "Voice typing had a problem. Press the microphone once more and it will listen a different way."
              : "Voice typing is unavailable right now. You can type instead.",
          );
          return;
        }

        if (!res.ok) {
          setError(
            res.status === 422
              ? "I did not catch that. Please try again, or type it instead."
              : "Something went wrong with the recording. You can type instead.",
          );
          return;
        }

        const json = (await res.json().catch(() => null)) as VoiceResult | null;
        if (!json?.text?.trim()) {
          setError("I did not catch that. Please try again, or type it instead.");
          return;
        }
        if (active.current && !controller.signal.aborted) onResult({ text: json.text, languageCode: json.languageCode || "en" });
      } catch {
        setError("Something went wrong with the recording. You can type instead.");
      } finally {
        setTranscribing(false);
      }
    },
    [onResult],
  );

  const startBrowser = useCallback(() => {
    const recognition = browserRecognition();
    if (!recognition) {
      setError("This browser cannot listen. Please type instead.");
      return;
    }
    recognition.lang = lang === "es" ? "es-ES" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      if (!active.current) return;
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) onResult({ text, languageCode: lang });
    };
    recognition.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "HealthThread needs permission to use the microphone. You can type instead."
          : "I did not catch that. Please try again, or type it instead.",
      );
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [lang, onResult]);

  const start = useCallback(async () => {
    setError(null);

    if (useScribe.current === false) {
      startBrowser();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { stream.getTracks().forEach(t => t.stop()); return; }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) void sendForTranscription(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      // Permission denied or no device. Try the browser engine, which may
      // reuse an already-granted permission, then give up gracefully.
      startBrowser();
    }
  }, [sendForTranscription, startBrowser]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      transcription.current?.abort();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    recording,
    transcribing,
    error,
    engine,
    supported: engine !== "none",
    clearError: () => setError(null),
  };
}
