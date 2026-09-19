"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Category, DraftEvent } from "@/lib/schema";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/lib/health/categories";
import { draftToEvent } from "@/lib/health/createEvent";
import { repository } from "@/lib/store";
import { useHealthData } from "@/components/health/useHealthData";
import { BodyMap } from "./BodyMap";
import { SeverityScale } from "./SeverityScale";
import { cn } from "@/lib/utils";

/*
  The path for patients who do not want to use an AI at all.

  It produces exactly the same HealthEvent as the assistant does — same fields,
  same store, same timeline, same trend engine. The only difference recorded is
  `inputMethod`, so the clinician view can honestly say how something was
  captured.
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

const ONSETS = ["Right now", "Today", "Yesterday", "A few days ago", "Over a week ago"];

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

export function ManualEntry() {
  const { metrics } = useHealthData();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [onset, setOnset] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setCategory(null);
    setSeverity(null);
    setLocation(null);
    setOnset(null);
    setNote("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const save = async () => {
    if (!category) return;

    const label =
      category === "pain" && location
        ? location === "Lower abdomen" || location === "Upper abdomen"
          ? "Abdominal pain"
          : location === "Head"
            ? "Headache"
            : `${location} pain`
        : DEFAULT_LABEL[category];

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
      inputLanguage: "en",
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

  if (!open) {
    return (
      <section className="card p-5 md:p-6">
        <h2 className="text-2xl font-bold">Would you rather not use the assistant?</h2>
        <p className="mt-2 text-lg text-muted">
          You can add health information yourself, with buttons and a body picture.
          It is saved exactly the same way.
        </p>
        <button
          type="button"
          className="btn btn-lg btn-secondary mt-4"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Add health information
        </button>
        {saved ? (
          <p role="status" className="mt-4 rounded-xl bg-brand-soft p-4 font-semibold">
            Saved to your timeline.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="card p-5 md:p-6" aria-labelledby="manual-heading">
      <div className="flex items-start justify-between gap-3">
        <h2 id="manual-heading" className="text-2xl font-bold">
          Add health information
        </h2>
        <button type="button" className="btn btn-sm btn-ghost" onClick={close}>
          <X className="h-5 w-5" aria-hidden />
          Close
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="label">What would you like to record?</legend>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <button
                type="button"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  if (c !== "pain") setLocation(null);
                }}
                className={cn(
                  "btn btn-md w-full justify-start gap-3 text-left",
                  category === c ? "btn-primary" : "btn-secondary",
                )}
              >
                <span aria-hidden className="text-2xl">
                  {CATEGORY_EMOJI[c]}
                </span>
                {CATEGORY_LABEL[c]}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {category ? (
        <div className="mt-6 space-y-6">
          {category === "pain" ? (
            <BodyMap value={location} onChange={setLocation} />
          ) : null}

          {category !== "medication" && category !== "cycle" ? (
            <SeverityScale value={severity} onChange={setSeverity} />
          ) : null}

          <fieldset>
            <legend className="label">When did it start?</legend>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ONSETS.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    aria-pressed={onset === o}
                    onClick={() => setOnset(o)}
                    className={cn("btn btn-md", onset === o ? "btn-primary" : "btn-secondary")}
                  >
                    {o}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="block">
            <span className="label">Anything you want to add? (optional)</span>
            <textarea
              className="field mt-1 min-h-[5rem]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="In your own words"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-lg btn-primary" onClick={save}>
              <Check className="h-5 w-5" aria-hidden />
              Save it
            </button>
            <button type="button" className="btn btn-lg btn-ghost" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
