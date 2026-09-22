"use client";

import { Moon, Sun } from "lucide-react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ full = false }: { full?: boolean }) {
  const { settings, update } = useSettings();
  const dark = settings.theme === "dark";
  const spanish = settings.language === "es";
  const label = dark ? (spanish ? "Modo claro" : "Light mode") : (spanish ? "Modo oscuro" : "Dark mode");
  return (
    <button className={cn("theme-toggle", full && "is-full")} type="button" onClick={() => update({ theme: dark ? "light" : "dark" })} aria-label={label} title={label}>
      {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      <span>{label}</span>
    </button>
  );
}
