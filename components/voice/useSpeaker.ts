"use client";

import { useCallback, useEffect, useState } from "react";
import {
  prewarm,
  speak as speakNow,
  stopSpeaking,
  voiceStatus,
  type Engine,
  type Speaker,
} from "@/lib/voice/speech";

/*
  React state around the speech module.

  The important part is `spokenText`: whatever the AI says on a patient's behalf
  is always rendered on screen while it plays. The patient has to be able to see
  what is being said for them, and it keeps the conversation accessible to a
  deaf or hard-of-hearing person in the room.
*/

export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<Speaker>("patient");
  const [engine, setEngine] = useState<Engine>("none");
  const [rate, setRate] = useState(1);
  const [elevenLabs, setElevenLabs] = useState<boolean | null>(null);

  useEffect(() => {
    void voiceStatus().then((s) => setElevenLabs(s.elevenlabs));
  }, []);

  // Never leave a voice talking after the patient navigates away.
  useEffect(() => () => stopSpeaking(), []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setSpokenText(null);
  }, []);

  const speak = useCallback(
    async (text: string, opts: { speaker?: Speaker; lang?: string } = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const who = opts.speaker ?? "patient";
      setSpeaker(who);
      setSpokenText(trimmed);
      setSpeaking(true);

      const used = await speakNow(trimmed, {
        speaker: who,
        rate,
        lang: opts.lang ?? "en",
        onEnd: () => {
          setSpeaking(false);
          setSpokenText(null);
        },
      });

      setEngine(used);
      if (used === "none") {
        setSpeaking(false);
        setSpokenText(null);
      }
    },
    [rate],
  );

  return {
    speak,
    stop,
    prewarm,
    speaking,
    spokenText,
    speaker,
    engine,
    rate,
    setRate,
    elevenLabs,
  };
}
