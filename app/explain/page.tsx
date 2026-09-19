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
import { PageHeader } from "@/components/ui/PageHeader";
import { useT } from "@/components/a11y/useT";
import { buildSummary, summaryToText, summaryForDisplay } from "@/lib/health/summary";
import { relativeDays } from "@/lib/dates";

export default function ExplainPage() {
  const { loading, events, metrics, detection, summary: storedSummary, saveSummary } = useHealthData();
  const summary = summaryForDisplay(storedSummary, events);
  const speech = useSpeaker();
  const { t } = useT();

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
    <div className="space-y-8">
      <PageHeader title={t("explain.heading")} description={t("explain.intro")} actions={<HelpTip topic="explain" />} />

      {loading ? (
        <p className="text-muted">{t("explain.loading")}</p>
      ) : !summary ? (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">{t("explain.readyHeading")}</h2>
          <p className="mt-2 text-base text-muted">{t("explain.readyBody")}</p>
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
            {working ? t("explain.puttingTogether") : t("explain.writeSummary")}
          </button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">
              {t("explain.writtenAgo", { when: relativeDays(summary.generatedAt) })}
              {summary.source === "llm" ? t("explain.wordingPolished") : ""}
            </p>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void generate()}
              disabled={working}
            >
              <RefreshCw className={working ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
              {t("explain.writeAgain")}
            </button>
          </div>

          <SummaryEditor summary={summary} onChange={saveSummary} disabled={working} />

          {/* The patient's verbatim words travel with the summary. */}
          {summary.quotedStatements.length > 0 && (
            <section aria-labelledby="quotes-heading" className="border-t border-line pt-8">
              <h2 id="quotes-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
                <Quote className="h-4 w-4" aria-hidden />
                {t("explain.quotesHeading")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("explain.quotesBody")}</p>
              <ul className="mt-3 space-y-2">
                {summary.quotedStatements.map((q, i) => (
                  <li key={i} className="border-l-2 border-line pl-3">
                    <p className="italic text-ink">&ldquo;{q.text}&rdquo;</p>
                    <p className="text-sm text-muted">
                      {relativeDays(q.when)}
                      {q.language !== "en" && t("explain.saidIn", { lang: q.language })}
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
                ? "rounded-2xl border border-good/40 bg-surface p-5"
                : "rounded-2xl border border-brand/40 bg-brand-soft/30 p-5"
            }
            aria-labelledby="approve-heading"
          >
            {summary.approved ? (
              <>
                <h2
                  id="approve-heading"
                  className="flex items-center gap-2 text-lg font-semibold text-ink"
                >
                  <BadgeCheck className="h-6 w-6 text-good" aria-hidden />
                  {t("explain.approvedHeading")}
                </h2>
                <p className="mt-1 text-base">{t("explain.approvedBody")}</p>

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
                        {t("explain.stop")}
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5" aria-hidden />
                        {t("explain.speakForMe")}
                      </>
                    )}
                  </button>

                  <Link href="/clinician" className="btn btn-lg btn-secondary">
                    <Stethoscope className="h-5 w-5" aria-hidden />
                    {t("explain.showMyDoctor")}
                  </Link>

                  <HelpTip topic="speakForMe" />
                </div>

                <label className="mt-4 flex max-w-sm flex-col gap-1">
                  <span className="label">{t("explain.speakingSpeed")}</span>
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
                      ? t("explain.slower")
                      : speech.rate > 1.1
                        ? t("explain.faster")
                        : t("explain.normalSpeed")}
                  </span>
                </label>
              </>
            ) : (
              <>
                <h2 id="approve-heading" className="text-lg font-semibold text-ink">
                  {t("explain.happyHeading")}
                </h2>
                <p className="mt-1 text-base text-muted">{t("explain.happyBody")}</p>
                <button
                  type="button"
                  className="btn btn-lg btn-primary mt-4"
                  onClick={() => void approve()}
                >
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                  {t("explain.approveSummary")}
                </button>
              </>
            )}
          </section>

          {/* Whatever is being said is always visible on screen. */}
          {speech.spokenText && (
            <section
              aria-live="polite"
              className="rounded-2xl border border-brand/40 bg-brand-soft p-5"
            >
              <p className="label flex items-center gap-2">
                <Volume2 className="h-4 w-4" aria-hidden />
                {t("explain.speakingNow")}
                {speech.engine === "browser" && (
                  <span className="normal-case text-muted">{t("explain.browserVoice")}</span>
                )}
              </p>
              <p className="mt-2 whitespace-pre-line text-lg">{speech.spokenText}</p>
              <button type="button" className="btn btn-md btn-secondary mt-3" onClick={speech.stop}>
                <Square className="h-4 w-4" aria-hidden />
                {t("explain.stop")}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
