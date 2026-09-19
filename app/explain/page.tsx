"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Loader2,
  Quote,
  RefreshCw,
  Square,
  Stethoscope,
  Volume2,
  Wand2,
} from "lucide-react";
import type { DoctorSummary } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { SummaryEditor } from "@/components/explain/SummaryEditor";
import { HelpTip } from "@/components/HelpTip";
import { buildSummary, summaryToText } from "@/lib/health/summary";
import { relativeDays } from "@/lib/dates";

export default function ExplainPage() {
  const { loading, events, metrics, detection, summary, saveSummary } = useHealthData();
  const speech = useSpeaker();

  const [working, setWorking] = useState(false);

  const generate = useCallback(async () => {
    setWorking(true);
    try {
      // Built from the record first. The model is only ever asked to reword it.
      const base = buildSummary(events, metrics, detection);
      let next = base;
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ summary: base }),
        });
        if (res.ok) next = (await res.json()) as DoctorSummary;
      } catch {
        // Keep the deterministic version; it is complete on its own.
      }
      await saveSummary(next);
    } finally {
      setWorking(false);
    }
  }, [events, metrics, detection, saveSummary]);

  const approve = useCallback(async () => {
    if (!summary) return;
    const approved = {
      ...summary,
      approved: true,
      approvedAt: new Date().toISOString(),
    };
    await saveSummary(approved);

    /*
      Fetch the audio the moment it is approved, so pressing Speak for Me in
      front of a doctor plays instantly instead of showing a spinner.
    */
    speech.prewarm(summaryToText(approved, { intro: true }), "patient");
  }, [summary, saveSummary, speech]);

  const spokenText = summary ? summaryToText(summary, { intro: true }) : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold md:text-4xl">Help Me Explain</h1>
        <HelpTip topic="explain" />
      </header>

      <p className="text-lg text-muted">
        CareBridge writes this from what you recorded. Read it, change anything you want,
        and remove anything you would rather keep private. Nothing is shared until you
        approve it.
      </p>

      {loading ? (
        <p className="text-muted">Loading your health information...</p>
      ) : !summary ? (
        <section className="card p-6">
          <h2 className="text-xl font-bold">Ready when you are</h2>
          <p className="mt-2 text-base text-muted">
            CareBridge will put together a short summary of the last week using only your
            own records.
          </p>
          <button
            type="button"
            className="btn btn-lg btn-primary mt-4"
            onClick={() => void generate()}
            disabled={working}
          >
            {working ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="h-5 w-5" aria-hidden />
            )}
            {working ? "Putting it together..." : "Write my summary"}
          </button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">
              Written {relativeDays(summary.generatedAt)}
              {summary.source === "llm" ? " (wording polished by AI)" : ""}
            </p>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void generate()}
              disabled={working}
            >
              <RefreshCw className={working ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
              Write it again
            </button>
          </div>

          <SummaryEditor summary={summary} onChange={saveSummary} disabled={working} />

          {/* The patient's verbatim words travel with the summary. */}
          {summary.quotedStatements.length > 0 && (
            <section className="card p-5" aria-labelledby="quotes-heading">
              <h2 id="quotes-heading" className="flex items-center gap-2 text-xl font-bold">
                <Quote className="h-5 w-5" aria-hidden />
                What I said, in my own words
              </h2>
              <p className="mt-1 text-sm text-muted">
                These go to your doctor exactly as you said them. CareBridge does not
                change them.
              </p>
              <ul className="mt-3 space-y-2">
                {summary.quotedStatements.map((q, i) => (
                  <li key={i} className="border-l-4 border-line pl-3">
                    <p className="italic">&ldquo;{q.text}&rdquo;</p>
                    <p className="text-sm text-muted">
                      {relativeDays(q.when)}
                      {q.language !== "en" && ` \u00B7 said in ${q.language}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --- Approval gate ------------------------------------------- */}
          <section
            className={
              summary.approved
                ? "card border-2 border-good p-5"
                : "card border-2 border-brand p-5"
            }
            aria-labelledby="approve-heading"
          >
            {summary.approved ? (
              <>
                <h2
                  id="approve-heading"
                  className="flex items-center gap-2 text-xl font-bold"
                >
                  <BadgeCheck className="h-6 w-6 text-good" aria-hidden />
                  You approved this summary
                </h2>
                <p className="mt-1 text-base">
                  It is ready to show or read to your doctor. If you edit it again you will
                  be asked to approve it once more.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn btn-lg btn-primary"
                    onClick={() =>
                      speech.speaking ? speech.stop() : void speech.speak(spokenText)
                    }
                  >
                    {speech.speaking ? (
                      <>
                        <Square className="h-5 w-5" aria-hidden />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5" aria-hidden />
                        Speak for Me
                      </>
                    )}
                  </button>

                  <Link href="/clinician" className="btn btn-lg btn-secondary">
                    <Stethoscope className="h-5 w-5" aria-hidden />
                    Show My Doctor
                  </Link>

                  <HelpTip topic="speakForMe" />
                </div>

                <label className="mt-4 flex max-w-sm flex-col gap-1">
                  <span className="label">Speaking speed</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.1}
                    value={speech.rate}
                    onChange={(e) => speech.setRate(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted">
                    {speech.rate < 0.9
                      ? "Slower"
                      : speech.rate > 1.1
                        ? "Faster"
                        : "Normal speed"}
                  </span>
                </label>
              </>
            ) : (
              <>
                <h2 id="approve-heading" className="text-xl font-bold">
                  Happy with this?
                </h2>
                <p className="mt-1 text-base text-muted">
                  Approving means you are comfortable showing this to your doctor. You can
                  still change it afterwards.
                </p>
                <button
                  type="button"
                  className="btn btn-lg btn-primary mt-4"
                  onClick={() => void approve()}
                >
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                  Approve this summary
                </button>
              </>
            )}
          </section>

          {/* Whatever is being said is always visible on screen. */}
          {speech.spokenText && (
            <section
              aria-live="polite"
              className="card border-2 border-brand bg-brand-soft p-5"
            >
              <p className="label flex items-center gap-2">
                <Volume2 className="h-4 w-4" aria-hidden />
                Speaking now
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
        </>
      )}
    </div>
  );
}
