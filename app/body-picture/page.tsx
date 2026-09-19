"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Pencil, PersonStanding } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BodyPicker } from "@/components/body/BodyPicker";
import { useHealthData } from "@/components/health/useHealthData";
import { useT } from "@/components/a11y/useT";
import { painLabelFor } from "@/lib/health/categories";
import { draftToEvent } from "@/lib/health/createEvent";
import { repository } from "@/lib/store";
import type { DraftEvent } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const DESCRIPTOR_KEYS = ["sharp", "dull", "throbbing", "burning", "pressure"] as const;
const PATTERN_KEYS = ["comesAndGoes", "constant"] as const;
const ONSETS = [
  { value: "Right now", key: "rightNow" },
  { value: "Today", key: "today" },
  { value: "Yesterday", key: "yesterday" },
  { value: "3 days ago", key: "threeDaysAgo" },
  { value: "A few days ago", key: "fewDaysAgo" },
  { value: "Over a week ago", key: "overWeekAgo" },
] as const;

/*
  The flagship standalone Body Picture experience — same HealthEvent schema
  and save path (draftToEvent -> repository.addEvent) that ManualEntry and
  the assistant use, so whatever gets recorded here shows up in Timeline,
  Health Changes, and Help Me Explain exactly like any other entry.
*/
export default function BodyPicturePage() {
  const { metrics } = useHealthData();
  const { t, tRaw, lang } = useT();

  const [location, setLocation] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [descriptors, setDescriptors] = useState<string[]>([]);
  const [pattern, setPattern] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [onset, setOnset] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const descriptorLabels = tRaw<Record<string, string>>("bodyPicture.descriptors");
  const regionLabels = tRaw<Record<string, string>>("bodyMap.regions");
  const extraLabels: Record<string, string> = lang === "es"
    ? { night: "Peor de noche", rest: "Mejor con descanso", activity: "Peor con actividad" }
    : { night: "Worse at night", rest: "Better with rest", activity: "Worse with activity" };
  const onsetLabel = (key: string) => key === "threeDaysAgo" ? (lang === "es" ? "Hace 3 días" : "3 days ago") : t(`manualEntry.onsets.${key}`);

  const toggleDescriptor = (key: string) => {
    setDescriptors((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  };

  const composedNote = [
    ...descriptors.map((d) => descriptorLabels[d] ?? extraLabels[d]),
    pattern ? descriptorLabels[pattern] : null,
    note.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const canReview = Boolean(location);

  const reset = () => {
    setLocation(null);
    setSeverity(null);
    setDescriptors([]);
    setPattern(null);
    setNote("");
    setOnset(null);
    setReviewing(false);
    setSaved(false);
  };

  const save = async () => {
    if (!location || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    const draft: DraftEvent = {
      category: "pain",
      label: painLabelFor(location),
      severity,
      bodyLocation: location,
      onset,
      pattern: null,
      trendHint: null,
      durationMinutes: null,
      originalInput: composedNote,
      inputLanguage: lang,
      translation: null,
      note: composedNote || null,
      cycleDay: null,
      cyclePhase: null,
    };
    try {
      await repository.addEvent(draftToEvent(draft, "visual", metrics));
      setSaved(true);
    } catch {
      setError(lang === "es" ? "No se pudo guardar. Inténtalo de nuevo." : "Could not save your entry. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Check className="h-7 w-7" aria-hidden />
        </p>
        <h1 className="text-2xl font-semibold text-ink">{t("bodyPicture.savedTitle")}</h1>
        <p className="mt-2 text-muted">{t("bodyPicture.savedBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/timeline" className="btn btn-lg btn-primary">
            {t("home.seeEverything")}
          </Link>
          <button type="button" className="btn btn-lg btn-secondary" onClick={reset}>
            {t("bodyPicture.startOver")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body-page">
      <PageHeader title={t("bodyPicture.heading")} description={lang === "es" ? "Muéstranos dónde duele. Toca el cuerpo para marcar el dolor." : "Show us where it hurts. Click or tap on the body to mark your pain."}
        actions={<div className="hidden md:block"><ThemeToggle /></div>} />

      <div className="body-workspace">
        <div className="body-canvas-column">
          <BodyPicker value={location} severity={severity} onChange={(id) => { setLocation(id); setReviewing(false); }} />
        </div>

        <div className="body-details" ref={detailsRef}>
          <p className="detail-label !mb-0">{t("bodyMap.selectedArea")}</p>
          <div className="body-selection">
            <span className={cn("body-selection-icon", location && "is-selected")}><PersonStanding size={26} strokeWidth={1.3} aria-hidden /></span>
            <div><h2 className="text-base font-medium" aria-live="polite">{location ? (lang === "en" ? location : regionLabels[location] ?? location) : (lang === "es" ? "Elige un área" : "Choose an area")}</h2><p className="text-xs text-muted mt-1">{location ? (lang === "es" ? "Seleccionado en el cuerpo" : "Selected on the body") : (lang === "es" ? "Toca el cuerpo para empezar" : "Click the body to get started")}</p></div>
          </div>
          {!reviewing ? <>
            <div className="intensity-section">
              <label htmlFor="pain-intensity" className="detail-label">{lang === "es" ? "Intensidad del dolor" : "Pain Intensity"}</label>
              <div className="intensity-value"><span>{severity ?? "—"}</span><span>/ 10</span><button type="button" onClick={() => setSeverity(null)} aria-pressed={severity === null}>{lang === "es" ? "No lo sé" : "Not sure"}</button></div>
              <input id="pain-intensity" className="pain-slider" style={{ background: `linear-gradient(to right, #dc575f 0%, #e6a080 ${(severity ?? 0) * 10}%, rgb(var(--raised)) ${(severity ?? 0) * 10}%, rgb(var(--raised)) 100%)` }} type="range" min="0" max="10" step="1" value={severity ?? 0} aria-valuetext={severity === null ? (lang === "es" ? "Sin elegir" : "Not selected") : `${severity} / 10`} onChange={(e) => setSeverity(Number(e.target.value))} onPointerUp={(e) => { if (severity === null) setSeverity(Number(e.currentTarget.value)); }} />
              <div className="intensity-labels">{[0,2,4,6,8,10].map((n) => <span key={n}>{n}</span>)}</div>
            </div>
            <div>
              <label htmlFor="body-description" className="detail-label">{lang === "es" ? "Descripción" : "Description"}</label>
              <div className="description-field"><textarea id="body-description" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("bodyPicture.notePlaceholder")} /><span>{note.length}/500</span></div>
            </div>
            <div>
              <label htmlFor="body-onset" className="detail-label">{t("bodyPicture.whenStart")}</label>
              <select id="body-onset" className="field" value={onset ?? ""} onChange={(e) => setOnset(e.target.value || null)}><option value="">{lang === "es" ? "No estoy seguro/a" : "I’m not sure"}</option>{ONSETS.map((o) => <option key={o.value} value={o.value}>{onsetLabel(o.key)}</option>)}</select>
            </div>
            <div>
              <p className="detail-label">{lang === "es" ? "Detalles adicionales" : "Additional details"} <span className="text-muted font-normal">{lang === "es" ? "(opcional)" : "(optional)"}</span></p>
              <div className="descriptor-chips">{DESCRIPTOR_KEYS.map((key) => <button key={key} type="button" aria-pressed={descriptors.includes(key)} onClick={() => toggleDescriptor(key)}>{descriptorLabels[key]}</button>)}{PATTERN_KEYS.map((key) => <button key={key} type="button" aria-pressed={pattern === key} onClick={() => setPattern((p) => p === key ? null : key)}>{descriptorLabels[key]}</button>)}{Object.entries(extraLabels).map(([key, label]) => <button key={key} type="button" aria-pressed={descriptors.includes(key)} onClick={() => toggleDescriptor(key)}>{label}</button>)}</div>
            </div>
            <button type="button" className="btn btn-md btn-primary w-full" disabled={!canReview} onClick={() => setReviewing(true)}>{t("bodyPicture.addToTimeline")}<ArrowRight size={16} aria-hidden /></button>
            <p className="text-xs text-muted text-center">{location ? (lang === "es" ? "Podrás revisar todo antes de guardar." : "You’ll review your entry before saving.") : (lang === "es" ? "Elige primero un área del cuerpo." : "Choose an area on the body to continue.")}</p>
          </> : <div className="space-y-4" aria-live="polite">
            <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-medium">{t("bodyPicture.reviewHeading")}</h2><button type="button" className="btn btn-sm btn-ghost" onClick={() => setReviewing(false)} disabled={saving}><Pencil size={14} aria-hidden />{t("bodyPicture.change")}</button></div>
            <p className="text-lg">{painLabelFor(location!)}</p>
            <dl className="review-details"><div><dt>{t("bodyPicture.howStrong")}</dt><dd>{severity === null ? (lang === "es" ? "Sin registrar" : "Not recorded") : `${severity} / 10`}</dd></div><div><dt>{t("bodyPicture.whenStart")}</dt><dd>{onset ? onsetLabel(ONSETS.find((o) => o.value === onset)!.key) : (lang === "es" ? "Sin registrar" : "Not recorded")}</dd></div></dl>
            {composedNote && <p className="text-sm text-muted break-words">“{composedNote}”</p>}
            {error && <p role="alert" className="text-danger text-sm">{error}</p>}
            <button type="button" className="btn btn-md btn-primary w-full" disabled={saving} onClick={() => void save()}><Check size={16} aria-hidden />{saving ? (lang === "es" ? "Guardando…" : "Saving…") : t("bodyPicture.addToTimeline")}</button>
          </div>}
        </div>
      </div>
    </div>
  );
}
