"use client";

import { useEffect } from "react";
import { useSettings } from "./SettingsProvider";
import { speak } from "@/lib/voice/speech";

/*
  Read Aloud used to only speak the assistant's own replies. This makes every
  button, link, and [role=button] speak its accessible name on click, so
  someone who can't read the screen still knows what they just pressed —
  using the same single voice as everywhere else (lib/voice/speech.ts), not a
  second engine.

  A global listener rather than per-component wiring, because "every control"
  includes ones this change doesn't otherwise touch. Skips while a mic is
  recording (components/assistant/AssistantPanel.tsx sets
  document.body.dataset.recording) so it doesn't talk over the patient.
*/

function accessibleName(el: Element): string {
  const fullText = el.getAttribute("data-read-aloud-text");
  if (fullText?.trim()) return fullText.trim();
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  return (el.textContent ?? "").trim();
}

export function ReadAloud() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.readAloud) return;

    const onClick = (e: MouseEvent) => {
      if (document.body.dataset.recording === "true") return;
      const target = (e.target as Element | null)?.closest("button, a[href], [role=button]");
      if (!target) return;
      const name = accessibleName(target);
      if (name) void speak(name, { lang: settings.language });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [settings.readAloud, settings.language]);

  return null;
}
