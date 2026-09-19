"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Quote, Square, Volume2 } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { VoiceAdvocate } from "@/components/clinician/VoiceAdvocate";
import { QuickPhrases } from "@/components/clinician/QuickPhrases";
import { DoctorSpeaks } from "@/components/clinician/DoctorSpeaks";
import { METRICS } from "@/lib/health/metrics";
import { summaryToText } from "@/lib/health/summary";
import { relativeDays } from "@/lib/dates";

/*
  Clinician mode. No assistant, no settings, no navigation to get lost in —
  the approved summary, the evidence behind it, and the patient's own words.

  Clearly labelled as patient-generated information, because a doctor needs to
  know what they are reading before they read it.
*/

export default function ClinicianPage() {
  const { loading, summary, detection, events } = useHealthData();
  const speech = useSpeaker();

  const included = summary?.sections.filter((s) => s.included) ?? [];
  const fullText = summary ? summaryToText(summary, { intro: true }) : "";

  // Ready the audio on arrival so the first press plays immediately.
  useEffect(() => {
    if (summary?.approved && fullText) speech.prewarm(fullText, "patient");
  }, [summary?.approved, fullText, speech]);

  if (loading) {
    return <p className="text-muted">Loading...</p>;
  }

  if (!summary?.approved) {
    return (
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Nothing has been approved to share yet</h1>
        <p className="mt-2 text-lg text-muted">
          This page only shows a summary the patient has read and approved. Nothing is
          shared without that.
        </p>
        <Link href="/explain" className="btn btn-lg btn-primary mt-4">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Go to Help Me Explain
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b-2 border-line pb-4">
        <p className="label">Patient-generated health information</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">Alex &mdash; health summary</h1>
        <p className="mt-1 text-muted">
          Recorded by the patient over time and organized by CareBridge. Approved by the
          patient {relativeDays(summary.approvedAt ?? summary.generatedAt)}. Not a
          diagnosis.
        </p>
      </header>

      {/* Whatever is being spoken is always on screen, with who is speaking. */}
      {speech.spokenText && (
        <section
          aria-live="polite"
          className="card border-2 border-brand bg-brand-soft p-5"
        >
          <p className="label flex items-center gap-2">
            <Volume2 className="h-4 w-4" aria-hidden />
            {speech.speaker === "clinical"
              ? "CareBridge is reading the record to the doctor"
              : "CareBridge is speaking for the patient"}
            {speech.engine === "browser" && (
              <span className="normal-case text-muted">(browser voice)</span>
            )}
          </p>
          <p className="mt-2 whitespace-pre-line text-lg">{speech.spokenText}</p>
          <button type="button" className="btn btn-md btn-secondary mt-3" onClick={speech.stop}>
            <Square className="h-4 w-4" aria-hidden />
            Stop
          </button>
        </section>
      )}

      {/* --- Two voices, deliberately distinct ------------------------------ */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-lg btn-primary"
          onClick={() => (speech.speaking ? speech.stop() : void speech.speak(fullText))}
        >
          <Volume2 className="h-5 w-5" aria-hidden />
          Speak for Me
        </button>

        <button
          type="button"
          className="btn btn-lg btn-secondary"
          onClick={() =>
            speech.speaking
              ? speech.stop()
              : void speech.speak(fullText, { speaker: "clinical" })
          }
        >
          <Volume2 className="h-5 w-5" aria-hidden />
          Read this to me
        </button>

        <label className="flex items-center gap-2">
          <span className="label">Speed</span>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.1}
            value={speech.rate}
            onChange={(e) => speech.setRate(Number(e.target.value))}
            aria-label="Speaking speed"
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        &ldquo;Speak for Me&rdquo; speaks as the patient. &ldquo;Read this to me&rdquo;
        reads the record to you in a different voice, so it is always clear who is
        talking.
      </p>

      {/* --- The summary, section by section, each replayable -------------- */}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-2xl font-bold">
          Summary
        </h2>
        <ul className="mt-3 space-y-4">
          {included.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{s.heading}</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    void speech.speak(`${s.heading}. ${s.body.replace(/^- /gm, "")}`, {
                      speaker: "clinical",
                    })
                  }
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                  Read this part
                </button>
              </div>
              <p className="mt-2 whitespace-pre-line text-base">{s.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- The measurements behind it ------------------------------------ */}
      {detection && detection.evaluated.length > 0 && (
        <section className="card p-5" aria-labelledby="measurements-heading">
          <h2 id="measurements-heading" className="text-2xl font-bold">
            Measurements
          </h2>
          <p className="mt-1 text-sm text-muted">
            Last {detection.windowDays} days against the patient&apos;s own baseline
            {detection.signals[0]?.baselineSource === "cycle-phase"
              ? ` for the same ${detection.phase} phase of previous cycles (n=${detection.signals[0].n})`
              : ""}
            .
          </p>

          <table className="mt-4 w-full text-left">
            <thead>
              <tr className="border-b-2 border-line">
                <th scope="col" className="py-2 pr-3">Measurement</th>
                <th scope="col" className="py-2 pr-3">Baseline</th>
                <th scope="col" className="py-2 pr-3">Recent</th>
                <th scope="col" className="py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {detection.evaluated.map((s) => {
                const meta = METRICS[s.metric];
                const isSignal = detection.signals.some((x) => x.metric === s.metric);
                return (
                  <tr key={s.metric} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {meta.label}
                    </th>
                    <td className="py-2 pr-3">{meta.format(s.baselineValue)}</td>
                    <td className={isSignal ? "py-2 pr-3 font-bold" : "py-2 pr-3"}>
                      {meta.format(s.currentValue)}
                    </td>
                    <td className="py-2">
                      {isSignal
                        ? `${s.deltaPct > 0 ? "+" : ""}${s.deltaPct.toFixed(0)}% (z=${s.z.toFixed(1)})`
                        : "no material change"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* --- Verbatim patient statements ----------------------------------- */}
      {summary.quotedStatements.length > 0 && (
        <section className="card p-5" aria-labelledby="verbatim-heading">
          <h2 id="verbatim-heading" className="flex items-center gap-2 text-2xl font-bold">
            <Quote className="h-5 w-5" aria-hidden />
            Patient&apos;s own words
          </h2>
          <p className="mt-1 text-sm text-muted">
            Unedited and untranslated, as recorded.
          </p>
          <ul className="mt-3 space-y-3">
            {summary.quotedStatements.map((q, i) => (
              <li key={i} className="border-l-4 border-line pl-3">
                <p className="italic">&ldquo;{q.text}&rdquo;</p>
                <p className="text-sm text-muted">
                  {new Date(q.when).toLocaleString("en-US")}
                  {q.language !== "en" && ` \u00B7 spoken in ${q.language}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <VoiceAdvocate speech={speech} />
      <QuickPhrases speech={speech} />
      <DoctorSpeaks speech={speech} />

      <p className="text-sm text-muted">
        {events.length} entries recorded by the patient. CareBridge organizes
        patient-reported information and compares it with the patient&apos;s own history.
        It does not diagnose.
      </p>
    </div>
  );
}
