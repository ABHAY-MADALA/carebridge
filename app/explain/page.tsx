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
import { useHealthData } from "@/components/health/useHealthData";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { SummaryEditor } from "@/components/explain/SummaryEditor";
import { HelpTip } from "@/components/HelpTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";
import { summaryForDisplay } from "@/lib/health/summary";
import { relativeDays } from "@/lib/dates";

function CalmDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="calm-details">
      <summary>{title}</summary>
      <div className="calm-details-content">{children}</div>
    </details>
  );
}

export default function ExplainPage() {
  const {
    loading,
    events,
    summary: storedSummary,
    saveSummary,
    generateSummary,
    getApprovedSpeech,
  } = useHealthData();
  const summary = summaryForDisplay(storedSummary, events);
  const speech = useSpeaker();
  const { t } = useT();
  const { settings } = useSettings();
  const calmMode = settings.lowStimulation;

  const [working, setWorking] = useState(false);

  const generate = useCallback(async () => {
    setWorking(true);
    try {
      await generateSummary();
    } finally {
      setWorking(false);
    }
  }, [generateSummary]);

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
    const approvedText = await getApprovedSpeech();
    speech.prewarm(approvedText, "patient");
  }, [getApprovedSpeech, summary, saveSummary, speech]);

  const quotedStatements = summary ? (
    <ul className="mt-3 space-y-2">
      {summary.quotedStatements.map((quote, index) => (
        <li key={index} className="border-l-2 border-line pl-3">
          <p className="italic text-ink">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-sm text-muted">
            {relativeDays(quote.when)}
            {quote.language !== "en" && t("explain.saidIn", { lang: quote.language })}
          </p>
        </li>
      ))}
    </ul>
  ) : null;
  const speakingSpeedControl = (
    <label className="flex max-w-sm flex-col gap-1">
      <span className="label">{t("explain.speakingSpeed")}</span>
      <input
        type="range"
        min={0.6}
        max={1.4}
        step={0.1}
        value={speech.rate}
        onChange={(event) => speech.setRate(Number(event.target.value))}
      />
      <span className="text-sm text-muted">
        {speech.rate < 0.9
          ? t("explain.slower")
          : speech.rate > 1.1
            ? t("explain.faster")
            : t("explain.normalSpeed")}
      </span>
    </label>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("explain.heading")}
        description={t("explain.intro")}
        actions={<span data-density-hide><HelpTip topic="explain" /></span>}
      />

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
            {calmMode ? (
              <div className="w-full max-w-sm">
                <CalmDetails title={t("explain.moreOptions")}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => void generate()}
                    disabled={working}
                  >
                    <RefreshCw className={working ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
                    {t("explain.writeAgain")}
                  </button>
                </CalmDetails>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => void generate()}
                disabled={working}
              >
                <RefreshCw className={working ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
                {t("explain.writeAgain")}
              </button>
            )}
          </div>

          <SummaryEditor summary={summary} onChange={saveSummary} disabled={working} calmMode={calmMode} />

          {/* The patient's verbatim words travel with the summary. */}
          {summary.quotedStatements.length > 0 && (
            calmMode ? (
              <CalmDetails title={t("explain.quotesHeading")}>
                <p className="text-sm text-muted">{t("explain.quotesBody")}</p>
                {quotedStatements}
              </CalmDetails>
            ) : (
              <section aria-labelledby="quotes-heading" className="border-t border-line pt-8">
                <h2 id="quotes-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Quote className="h-4 w-4" aria-hidden />
                  {t("explain.quotesHeading")}
                </h2>
                <p className="mt-1 text-sm text-muted">{t("explain.quotesBody")}</p>
                {quotedStatements}
              </section>
            )
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
                      speech.speaking
                        ? speech.stop()
                        : void getApprovedSpeech().then((text) => speech.speak(text))
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

                  <span data-density-hide><HelpTip topic="speakForMe" /></span>
                </div>

                {calmMode ? (
                  <div className="mt-4 max-w-sm">
                    <CalmDetails title={t("explain.speakingOptions")}>
                      {speakingSpeedControl}
                    </CalmDetails>
                  </div>
                ) : (
                  <div className="mt-4">{speakingSpeedControl}</div>
                )}
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
