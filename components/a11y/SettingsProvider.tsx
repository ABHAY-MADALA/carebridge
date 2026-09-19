"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TextSize = "sm" | "base" | "lg" | "xl";
export type Language = "en" | "es";

export type Settings = {
  theme: "light" | "dark";
  textSize: TextSize;
  highContrast: boolean;
  lowStimulation: boolean;
  readAloud: boolean;
  language: Language;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  textSize: "base",
  highContrast: false,
  lowStimulation: false,
  readAloud: false,
  language: "en",
};

// Accessibility preferences are the only thing we keep in localStorage under
// this key. Health data lives in the repository under its own key.
export const SETTINGS_KEY = "carebridge.settings.v1";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  ready: boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

function applyToDocument(s: Settings) {
  const el = document.documentElement;
  el.dataset.theme = s.theme === "light" ? "light" : "dark";
  el.dataset.textsize = s.textSize;
  el.dataset.contrast = s.highContrast ? "high" : "normal";
  el.dataset.motion = s.lowStimulation ? "reduced" : "full";
  // Separate from data-motion on purpose: motion controls animation, density
  // controls how much is on screen at once. globals.css hides anything
  // marked [data-density-hide] under "calm".
  el.dataset.density = s.lowStimulation ? "calm" : "full";
  el.lang = s.language;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
        setSettings(parsed);
        applyToDocument(parsed);
      } else {
        applyToDocument(DEFAULT_SETTINGS);
      }
    } catch {
      applyToDocument(DEFAULT_SETTINGS);
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applyToDocument(next);
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* preferences are non-essential; never block the UI on storage */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update, ready }), [settings, update, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
