"use client";

import { Contrast, Languages, Minus, Plus, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextSize, useSettings } from "./SettingsProvider";

const SIZES: TextSize[] = ["sm", "base", "lg", "xl"];

export function AccessibilityBar() {
  const { settings, update } = useSettings();
  const idx = SIZES.indexOf(settings.textSize);

  const step = (dir: -1 | 1) => {
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, idx + dir))];
    update({ textSize: next });
  };

  return (
    <div className="border-b border-line bg-raised">
      <div
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2"
        role="group"
        aria-label="Accessibility settings"
      >
        <span className="mr-1 text-sm font-semibold text-muted">Accessibility</span>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
            onClick={() => step(-1)}
            disabled={idx <= 0}
            aria-label="Decrease text size"
          >
            <Minus className="h-4 w-4" aria-hidden />
            <span className="text-sm">A</span>
          </button>
          <span className="px-1 text-sm font-semibold" aria-live="polite">
            {settings.textSize === "sm"
              ? "Small"
              : settings.textSize === "base"
                ? "Normal"
                : settings.textSize === "lg"
                  ? "Large"
                  : "Largest"}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
            onClick={() => step(1)}
            disabled={idx >= SIZES.length - 1}
            aria-label="Increase text size"
          >
            <span className="text-base">A</span>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <Toggle
          on={settings.highContrast}
          onClick={() => update({ highContrast: !settings.highContrast })}
          icon={<Contrast className="h-4 w-4" aria-hidden />}
          label="High contrast"
        />

        <Toggle
          on={settings.lowStimulation}
          onClick={() => update({ lowStimulation: !settings.lowStimulation })}
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          label="Low stimulation"
        />

        <Toggle
          on={settings.readAloud}
          onClick={() => update({ readAloud: !settings.readAloud })}
          icon={<Volume2 className="h-4 w-4" aria-hidden />}
          label="Read aloud"
        />

        <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Language</span>
          <select
            className="rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-semibold"
            value={settings.language}
            onChange={(e) => update({ language: e.target.value as "en" | "es" })}
          >
            <option value="en">English</option>
            <option value="es">Espa&ntilde;ol</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "btn btn-sm !min-h-[2.5rem] border-2",
        on ? "btn-primary border-brand" : "btn-secondary",
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="sr-only">{on ? "on" : "off"}</span>
    </button>
  );
}
