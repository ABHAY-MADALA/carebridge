"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Quote, Square, Volume2 } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { VoiceAdvocate } from "@/components/clinician/VoiceAdvocate";
import { QuickPhrases } from "@/components/clinician/QuickPhrases";
import { DoctorSpeaks } from "@/components/clinician/DoctorSpeaks";
import { HealthMetric } from "@/components/ui/HealthMetric";
import { useT } from "@/components/a11y/useT";
import { useProfile } from "@/components/profile/ProfileProvider";
import { METRICS } from "@/lib/health/metrics";
import { summaryForDisplay } from "@/lib/health/summary";
import { relativeDays } from "@/lib/dates";

/*
  Clinician mode. No assistant, no settings, no navigation to get lost in —
  the approved summary, the evidence behind it, and the patient's own words.
  A one-page clinical handoff: restrained section rhythm (thin dividers, not
  stacked bordered cards), because a doctor reading this on a tablet in an
  exam room should be able to scan it in seconds.

  Clearly labelled as patient-generated information, because a doctor needs to
  know what they are reading before they read it.
*/

export default function ClinicianPage() {
  const {
    loading,
    summary: storedSummary,
    detection,
    events,
    getApprovedSpeech,
  } = useHealthData();
  const { profile } = useProfile();
  const summary = summaryForDisplay(storedSummary, events);
  const speech = useSpeaker();
  const { t } = useT();

  const included = summary?.sections.filter((s) => s.included) ?? [];

  // Ready the audio on arrival so the first press plays immediately.
  useEffect(() => {
    let cancelled = false;
    if (summary?.approved) {
      void getApprovedSpeech().then((text) => {
        if (!cancelled) speech.prewarm(text, "patient");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [getApprovedSpeech, summary?.approved, speech]);

  if (loading) {
    return <p className="text-muted">{t("clinician.loading")}</p>;
  }

  if (!summary?.approved) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink">{t("clinician.notApprovedTitle")}</h1>
        <p className="mt-2 text-base text-muted">{t("clinician.notApprovedBody")}</p>
        <Link href="/explain" className="btn btn-lg btn-primary mt-4">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          {t("clinician.goToExplain")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-line pb-5">
        <p className="label">{t("clinician.patientGenerated")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-[1.75rem]">
          {t("nav.clinician")}
        </h1>
        <p className="mt-1 text-muted">
          {profile.name} — {profile.synthetic ? "Demo Patient" : "Personal"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t("clinician.approvedLine", { when: relativeDays(summary.approvedAt ?? summary.generatedAt) })}
        </p>
      </header>

      {/* Whatever is being spoken is always on screen, with who is speaking. */}
      {speech.spokenText && (
        <section aria-live="polite" className="rounded-2xl border border-brand/40 bg-brand-soft p-5">
          <p className="label flex items-center gap-2">
            <Volume2 className="h-4 w-4" aria-hidden />
            {t("clinician.speaking")}
            {speech.engine === "browser" && <span className="normal-case text-muted">{t("clinician.browserVoice")}</span>}
          </p>
          <p className="mt-2 whitespace-pre-line text-base">{speech.spokenText}</p>
          <button type="button" className="btn btn-sm btn-secondary mt-3" onClick={speech.stop}>
            <Square className="h-3.5 w-3.5" aria-hidden />
            {t("explain.stop")}
          </button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn btn-lg btn-primary"
          onClick={() =>
            speech.speaking
              ? speech.stop()
              : void getApprovedSpeech().then((text) => speech.speak(text))
          }
        >
          <Volume2 className="h-5 w-5" aria-hidden />
          {t("clinician.readOutLoud")}
        </button>

        <label className="flex items-center gap-2 text-sm">
          <span className="label">{t("clinician.speed")}</span>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.1}
            value={speech.rate}
            onChange={(e) => speech.setRate(Number(e.target.value))}
            aria-label={t("explain.speakingSpeed")}
          />
        </label>
      </div>

      {/* --- The summary, section by section, each replayable -------------- */}
      <section aria-labelledby="summary-heading" className="border-t border-line pt-8">
        <h2 id="summary-heading" className="text-lg font-semibold text-ink">
          {t("clinician.summaryHeading")}
        </h2>
        <div className="mt-3 divide-y divide-line">
          {included.map((s) => (
            <div key={s.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">{s.heading}</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost !min-h-[2.25rem]"
                  onClick={() =>
                    void getApprovedSpeech(s.id).then((text) => speech.speak(text))
                  }
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden />
                  {t("clinician.readThisPart")}
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-base leading-relaxed text-ink">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- The measurements behind it ------------------------------------ */}
      {detection && detection.evaluated.length > 0 && (
        <section aria-labelledby="measurements-heading" className="border-t border-line pt-8">
          <h2 id="measurements-heading" className="text-lg font-semibold text-ink">
            {t("clinician.measurementsHeading")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("clinician.measurementsSubtitle", {
              days: detection.windowDays,
              phaseNote:
                detection.signals[0]?.baselineSource === "cycle-phase"
                  ? t("clinician.measurementsPhaseNote", {
                      phase: detection.phase ? t(`insights.phase.${detection.phase}`) : "",
                      n: detection.signals[0].n,
                    })
                  : "",
            })}
          </p>

          <div className="mt-3">
            {detection.evaluated.map((s) => {
              const meta = METRICS[s.metric];
              const isSignal = detection.signals.some((x) => x.metric === s.metric);
              return (
                <HealthMetric
                  key={s.metric}
                  label={meta.label}
                  usual={meta.format(s.baselineValue)}
                  recent={meta.format(s.currentValue)}
                  delta={isSignal ? `${s.deltaPct > 0 ? "+" : ""}${s.deltaPct.toFixed(0)}% (z=${s.z.toFixed(1)})` : t("clinician.noMaterialChange")}
                  adverse={isSignal}
                  emphasize={isSignal}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* --- Verbatim patient statements ----------------------------------- */}
      {summary.quotedStatements.length > 0 && (
        <section aria-labelledby="verbatim-heading" className="border-t border-line pt-8">
          <h2 id="verbatim-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Quote className="h-4 w-4" aria-hidden />
            {t("clinician.quotesHeading")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("clinician.quotesSubtitle")}</p>
          <ul className="mt-3 space-y-3">
            {summary.quotedStatements.map((q, i) => (
              <li key={i} className="border-l-2 border-line pl-3">
                <p className="italic text-ink">&ldquo;{q.text}&rdquo;</p>
                <p className="text-sm text-muted">
                  {new Date(q.when).toLocaleString("en-US")}
                  {q.language !== "en" && t("explain.saidIn", { lang: q.language })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="divide-y divide-line border-t border-line [&>*]:pt-8 [&>*:first-child]:pt-8">
        <VoiceAdvocate speech={speech} />
        <QuickPhrases speech={speech} />
        <DoctorSpeaks speech={speech} />
      </div>

      <p className="text-sm text-muted">{t("clinician.footer", { count: events.length })}</p>
    </div>
  );
}
