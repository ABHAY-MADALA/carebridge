"use client";

import { useState } from "react";
import { Check, Plus, X, Activity, Thermometer, BatteryLow, Pill, Moon, CalendarDays, Utensils, Smile, FileText, Stethoscope } from "lucide-react";
import type { Category, DraftEvent } from "@/lib/schema";
import { painLabelFor } from "@/lib/health/categories";
import { draftToEvent } from "@/lib/health/createEvent";
import { repository } from "@/lib/store";
import { useHealthData } from "@/components/health/useHealthData";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";
import { BodyPicker } from "@/components/body/BodyPicker";
import { SeverityScale } from "./SeverityScale";
import { cn } from "@/lib/utils";

/*
  The path for patients who do not want to use an AI at all.

  It produces exactly the same HealthEvent as the assistant does — same fields,
  same store, same timeline, same trend engine. The only difference recorded is
  `inputMethod`, so the clinician view can honestly say how something was
  captured.

  Under Low Stimulation this becomes a one-question-at-a-time wizard instead
  of revealing every field at once — same state, same save(), same drafted
  event; only the rendering order changes.
*/

const CATEGORIES: Category[] = [
  "pain",
  "illness",
  "fatigue",
  "medication",
  "sleep",
  "cycle",
  "food",
  "mood",
  "other",
];
const CATEGORY_ICON = { pain: Activity, illness: Thermometer, fatigue: BatteryLow, medication: Pill, sleep: Moon, cycle: CalendarDays, food: Utensils, mood: Smile, other: FileText, doctor_instruction: Stethoscope };

const ONSETS = [
  { value: "Right now", key: "rightNow" },
  { value: "Today", key: "today" },
  { value: "Yesterday", key: "yesterday" },
  { value: "A few days ago", key: "fewDaysAgo" },
  { value: "Over a week ago", key: "overWeekAgo" },
] as const;

// Stored labels — English always, never shown to the patient directly.
const DEFAULT_LABEL: Record<Category, string> = {
  pain: "Pain",
  illness: "Feeling unwell",
  fatigue: "Fatigue",
  medication: "Medication",
  sleep: "Sleep",
  cycle: "Cycle",
  food: "Appetite",
  mood: "Mood",
  doctor_instruction: "From my doctor",
  other: "Health note",
};

type WizardStep = "body" | "intensity" | "onset" | "note";

function stepsFor(category: Category): WizardStep[] {
  const steps: WizardStep[] = [];
  if (category === "pain") steps.push("body");
  if (category !== "medication" && category !== "cycle") steps.push("intensity");
  steps.push("onset", "note");
  return steps;
}

export function ManualEntry({
  forceWizard = false,
  startOpen = false,
  pageContext = false,
}: {
  /** Guided Check-In forces the step-by-step wizard regardless of the Low
   * Stimulation setting — same wizard, same save path, just always on for
   * that entry point. */
  forceWizard?: boolean;
  startOpen?: boolean;
  pageContext?: boolean;
} = {}) {
  const { metrics } = useHealthData();
  const { settings } = useSettings();
  const { t, lang } = useT();
  const wizardMode = forceWizard || settings.lowStimulation;
  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState<Category | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [onset, setOnset] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(0);

  const reset = () => {
    setCategory(null);
    setSeverity(null);
    setLocation(null);
    setOnset(null);
    setNote("");
    setWizardIndex(0);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const save = async () => {
    if (!category) return;

    const label = category === "pain" && location ? painLabelFor(location) : DEFAULT_LABEL[category];

    const draft: DraftEvent = {
      category,
      label,
      severity,
      bodyLocation: location,
      onset,
      pattern: null,
      trendHint: null,
      durationMinutes: null,
      originalInput: note.trim(),
      inputLanguage: lang,
      translation: null,
      note: note.trim() || null,
      cycleDay: null,
      cyclePhase: null,
    };

    await repository.addEvent(draftToEvent(draft, location ? "visual" : "form", metrics));
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
    close();
  };

  /*
    Deliberately renders no card or heading of its own — the page that uses it
    supplies the framing, so it can sit inside an existing section without
    producing a nested box and a duplicate title.
  */
  if (!open) {
    return (
      <div>
        <button
          type="button"
          className="btn btn-lg btn-secondary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5" aria-hidden />
          {t("manualEntry.addHealthInfo")}
        </button>
        {saved ? (
          <p role="status" className="mt-4 rounded-xl bg-brand-soft p-4 font-semibold">
            {t("manualEntry.saved")}
          </p>
        ) : null}
      </div>
    );
  }

  const onsetButtons = (onSelect: (value: string) => void) => (
    <fieldset>
      <legend className="label">{t("manualEntry.whenStart")}</legend>
      <ul className="mt-2 flex flex-wrap gap-2">
        {ONSETS.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              aria-pressed={onset === o.value}
              onClick={() => onSelect(o.value)}
              className={cn("btn btn-md", onset === o.value ? "btn-primary" : "btn-secondary")}
            >
              {t(`manualEntry.onsets.${o.key}`)}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );

  const noteAndSave = (
    <>
      <label className="block">
        <span className="label">{t("manualEntry.notePrompt")}</span>
        <textarea
          className="field mt-1 min-h-[5rem]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("manualEntry.notePlaceholder")}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-lg btn-primary" onClick={save}>
          <Check className="h-5 w-5" aria-hidden />
          {t("manualEntry.saveIt")}
        </button>
        <button type="button" className="btn btn-lg btn-ghost" onClick={close}>
          {t("manualEntry.cancel")}
        </button>
      </div>
    </>
  );

  const steps = category ? stepsFor(category) : [];
  const currentStep = steps[wizardIndex];

  return (
    <div aria-labelledby="manual-heading">
      <div className="flex items-start justify-between gap-3">
        <h2 id="manual-heading" className="text-xl font-semibold">
          {t("manualEntry.addHeading")}
        </h2>
        {!pageContext && <button type="button" className="btn btn-sm btn-ghost" onClick={close}>
          <X className="h-5 w-5" aria-hidden />
          {t("manualEntry.close")}
        </button>}
      </div>

      <fieldset className="mt-4">
        <legend className="label">{t("manualEntry.whatToRecord")}</legend>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
            <li key={c}>
              <button
                type="button"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  setWizardIndex(0);
                  if (c !== "pain") setLocation(null);
                }}
                className={cn(
                  "btn btn-md w-full justify-start gap-3 text-left category-choice",
                  category === c ? "btn-primary" : "btn-secondary",
                )}
              >
                <Icon size={20} strokeWidth={1.5} className="shrink-0" aria-hidden />
                {t(`categories.${c}`)}
                {category === c && <Check size={16} className="ml-auto shrink-0" aria-hidden />}
              </button>
            </li>
          ); })}
        </ul>
      </fieldset>

      {category && !wizardMode ? (
        <div className="mt-6 space-y-6">
          {category === "pain" ? <BodyPicker value={location} onChange={setLocation} /> : null}

          {category !== "medication" && category !== "cycle" ? (
            <SeverityScale value={severity} onChange={setSeverity} />
          ) : null}

          {onsetButtons(setOnset)}
          {noteAndSave}
        </div>
      ) : null}

      {category && wizardMode ? (
        <div className="mt-6 space-y-6">
          {currentStep === "body" && (
            <BodyPicker
              value={location}
              onChange={(loc) => {
                setLocation(loc);
                setWizardIndex((i) => i + 1);
              }}
            />
          )}
          {currentStep === "intensity" && (
            <SeverityScale
              value={severity}
              onChange={(v) => {
                setSeverity(v);
                setWizardIndex((i) => i + 1);
              }}
            />
          )}
          {currentStep === "onset" &&
            onsetButtons((value) => {
              setOnset(value);
              setWizardIndex((i) => i + 1);
            })}
          {currentStep === "note" && noteAndSave}

          {wizardIndex > 0 && (
            <button
              type="button"
              className="btn btn-md btn-ghost"
              onClick={() => setWizardIndex((i) => Math.max(0, i - 1))}
            >
              {t("manualEntry.back")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
