"use client";

import { useCallback, useMemo } from "react";
import { useSettings } from "./SettingsProvider";
import { messages, type Language } from "@/lib/i18n/messages";

/*
  UI-chrome translation only. Stored/matched values (HealthEvent labels,
  onset strings, BodyMap region ids) never go through this — see the note
  at the top of lib/i18n/messages.ts.
*/

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const v = vars[key];
    return v === undefined ? match : String(v);
  });
}

export function useT() {
  const { settings } = useSettings();
  const lang: Language = settings.language;

  /** Leaf string lookup, with English fallback and {var} interpolation. */
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const value = getPath(messages[lang], path) ?? getPath(messages.en, path);
      if (typeof value !== "string") return path;
      return interpolate(value, vars);
    },
    [lang],
  );

  /** Non-string lookup (arrays, nested dictionaries) — cast at the call site. */
  const tRaw = useCallback(
    <T,>(path: string): T => {
      const value = getPath(messages[lang], path) ?? getPath(messages.en, path);
      return value as T;
    },
    [lang],
  );

  return useMemo(() => ({ t, tRaw, lang }), [t, tRaw, lang]);
}
