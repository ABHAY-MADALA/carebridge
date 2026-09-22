"use client";

import { Contrast, Languages, Minus, Plus, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextSize, useSettings } from "./SettingsProvider";
import { useT } from "./useT";

const SIZES: TextSize[] = ["sm", "base", "lg", "xl"];

/*
  The accessibility settings — text size, contrast, low
  stimulation, read aloud, language. Laid out horizontally (the old full-width top bar,
  kept for any narrow embedded use) or vertically (AccessibilityPanel, the
  sidebar-triggered popover that replaced the top bar as the app shell's
  primary presentation). Same state, same `useSettings()`, either layout.
*/
export function AccessibilityControls({ layout = "horizontal" }: { layout?: "horizontal" | "vertical" }) {
  const { settings, update } = useSettings();
  const { t } = useT();
  const idx = SIZES.indexOf(settings.textSize);
  const vertical = layout === "vertical";

  const step = (dir: -1 | 1) => {
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, idx + dir))];
    update({ textSize: next });
  };

  return (
    <div
      className={cn("flex gap-3", vertical ? "flex-col items-stretch" : "flex-wrap items-center")}
      role="group"
      aria-label={t("a11yBar.heading")}
    >
      <div className={cn("flex items-center gap-1 rounded-xl border border-line bg-surface p-1", vertical && "self-start")}>
        <button
          type="button"
          className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
          onClick={() => step(-1)}
          disabled={idx <= 0}
          aria-label={t("a11yBar.decreaseTextSize")}
        >
          <Minus className="h-4 w-4" aria-hidden />
          <span className="text-sm">A</span>
        </button>
        <span className="px-1 text-sm font-semibold" aria-live="polite">
          {t(`a11yBar.textSize.${settings.textSize}`)}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
          onClick={() => step(1)}
          disabled={idx >= SIZES.length - 1}
          aria-label={t("a11yBar.increaseTextSize")}
        >
          <span className="text-base">A</span>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Toggle
        on={settings.highContrast}
        onClick={() => update({ highContrast: !settings.highContrast })}
        icon={<Contrast className="h-4 w-4" aria-hidden />}
        label={t("a11yBar.highContrast")}
        onWord={t("a11yBar.on")}
        offWord={t("a11yBar.off")}
        full={vertical}
      />

      <Toggle
        on={settings.lowStimulation}
        onClick={() => update({ lowStimulation: !settings.lowStimulation })}
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        label={t("a11yBar.lowStimulation")}
        onWord={t("a11yBar.on")}
        offWord={t("a11yBar.off")}
        full={vertical}
      />

      <Toggle
        on={settings.readAloud}
        onClick={() => update({ readAloud: !settings.readAloud })}
        icon={<Volume2 className="h-4 w-4" aria-hidden />}
        label={t("a11yBar.readAloud")}
        onWord={t("a11yBar.on")}
        offWord={t("a11yBar.off")}
        full={vertical}
      />

      <label className={cn("flex items-center gap-2 text-sm font-semibold", vertical ? "" : "ml-auto")}>
        <Languages className="h-4 w-4" aria-hidden />
        <span>{t("a11yBar.language")}</span>
        <select
          className={cn(
            "rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-semibold",
            vertical && "ml-auto",
          )}
          value={settings.language}
          onChange={(e) => update({ language: e.target.value as "en" | "es" })}
        >
          <option value="en">English</option>
          <option value="es">Espa&ntilde;ol</option>
        </select>
      </label>
    </div>
  );
}

/** Legacy full-width top bar. No longer mounted by Chrome.tsx (see
 * AccessibilityPanel), kept as a thin wrapper in case a narrow embedded
 * context wants the horizontal layout directly. */
export function AccessibilityBar() {
  return (
    <div className="border-b border-line bg-raised">
      <div className="mx-auto max-w-6xl px-4 py-2">
        <AccessibilityControls layout="horizontal" />
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  icon,
  label,
  onWord,
  offWord,
  full,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  onWord: string;
  offWord: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "btn btn-sm !min-h-[2.5rem] border-2",
        full && "w-full justify-start",
        on ? "btn-primary border-brand" : "btn-secondary",
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="sr-only">{on ? onWord : offWord}</span>
    </button>
  );
}
