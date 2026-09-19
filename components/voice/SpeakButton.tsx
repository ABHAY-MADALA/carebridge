"use client";

import { Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Speaker } from "@/lib/voice/speech";

export function SpeakButton({
  text,
  speak,
  stop,
  speaking,
  speaker = "patient",
  rate = 1,
  lang = "en",
  label = "Read aloud",
  className,
  size = "sm",
}: {
  text: string;
  speak: (text: string, opts?: { speaker?: Speaker; rate?: number; lang?: string }) => void;
  stop: () => void;
  speaking: boolean;
  speaker?: Speaker;
  rate?: number;
  lang?: string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text, { speaker, rate, lang }))}
      className={cn("btn btn-secondary", `btn-${size}`, className)}
    >
      {speaking ? (
        <>
          <Square className="h-4 w-4" aria-hidden />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
