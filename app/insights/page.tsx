"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Hourglass } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { ChangeBanner } from "@/components/insights/ChangeBanner";
import { WhyAmISeeingThis } from "@/components/insights/WhyAmISeeingThis";
import { MetricChart } from "@/components/insights/MetricChart";
import { CalmMeasurement } from "@/components/insights/CalmMeasurement";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { HelpTip } from "@/components/HelpTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useT } from "@/components/a11y/useT";
import { METRICS, METRIC_ORDER } from "@/lib/health/metrics";
import { baselineByPhase } from "@/lib/health/baseline";

export default function InsightsPage() {
  const { loading, metrics, detection, baseline, baselineInfo } = useHealthData();
  const { t, lang } = useT();
  const { settings } = useSettings();

  // Pain by cycle phase is the clearest illustration of why a flat average
  // would be misleading for this patient.
  const painByPhase = useMemo(
    () => (metrics.length ? baselineByPhase(metrics.slice(0, -4), "painLevel") : []),
    [metrics],
  );

  const flatPainAverage = useMemo(() => {
    const vals = metrics
      .slice(-34, -4)
      .map((m) => m.painLevel)
      .filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [metrics]);

  const currentPhaseBaseline = baseline?.painLevel ?? null;

  return (
    <div>
      <PageHeader title={t("insights.heading")} actions={<HelpTip topic="changes" />} />

      {loading ? (
        <p className="text-muted">{t("insights.working")}</p>
      ) : (
        <div className="space-y-10">
          {baselineInfo?.status === "building" ? (
            <section className="flex flex-wrap items-start gap-3 rounded-2xl border border-line bg-surface p-5">
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Building your baseline
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  {baselineInfo.explanation ??
                    "Keep recording your information. CareBridge will compare you only with your own history once there is enough data."}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Alex&apos;s demo history and population averages are never used to fill
                  the gaps.
                </p>
              </div>
            </section>
          ) : detection?.triggered ? (
            <ChangeBanner detection={detection} showLink={false} />
          ) : (
            <section className="flex flex-wrap items-start gap-3 rounded-2xl border border-good/30 bg-brand-soft/40 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-ink">{t("insights.nothingUnusualTitle")}</h2>
                <p className="mt-0.5 text-sm text-muted">{t("insights.nothingUnusualBody")}</p>
                {detection && <WhyAmISeeingThis detection={detection} />}
              </div>
            </section>
          )}

          {/* --- Why the cycle phase matters ------------------------------ */}
          <section aria-labelledby="baseline-heading" className="border-t border-line pt-8">
            <SectionHeader id="baseline-heading" title={t("insights.normalHeading")} action={<HelpTip topic="cyclePhase" />} />
            <p className="max-w-2xl text-base text-muted">{t("insights.normalBody")}</p>

            {painByPhase.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-ink">{t("insights.usualPainHeading")}</h3>
                <ul className="mt-3 space-y-2.5">
                  {painByPhase.map((p) => {
                    const pct = (p.mean / 10) * 100;
                    const isCurrent = p.phase === detection?.phase;
                    return (
                      <li key={p.phase} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm font-medium text-ink">
                          {t(`insights.phase.${p.phase}`)}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                          <span
                            className={isCurrent ? "block h-full rounded-full bg-brand" : "block h-full rounded-full bg-line"}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-28 shrink-0 text-sm text-muted">
                          {METRICS.painLevel.format(p.mean)}
                          {isCurrent && <span className="ml-1 font-semibold text-ink">{t("insights.now")}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {flatPainAverage !== null && currentPhaseBaseline && (
                  <p className="mt-4 rounded-xl bg-brand-soft p-4 text-sm text-ink">
                    {t("insights.flatAveragePre")}{" "}
                    <strong>{METRICS.painLevel.format(flatPainAverage)}</strong>
                    {t("insights.flatAverageMid")}{" "}
                    <strong>{detection?.phase ? t(`insights.phase.${detection.phase}`) : ""}</strong>{" "}
                    {t("insights.flatAveragePhaseSuffix")}{" "}
                    <strong>{METRICS.painLevel.format(currentPhaseBaseline.mean)}</strong>
                    {t("insights.flatAveragePost")}
                  </p>
                )}
              </>
            )}
          </section>

          {/* --- The measurements themselves ------------------------------ */}
          <section aria-labelledby="charts-heading" className="border-t border-line pt-8">
            <SectionHeader id="charts-heading" title={t("insights.measurementsHeading")} description={settings.lowStimulation ? (lang === "es" ? `Tu nivel habitual comparado con el promedio de los últimos ${detection?.windowDays ?? 4} días registrados.` : `Your usual level compared with the average of the last ${detection?.windowDays ?? 4} recorded days.`) : t("insights.measurementsSubtitle")} />

            <div className="measurement-grid grid gap-x-6 gap-y-4 md:grid-cols-2">
              {METRIC_ORDER.map((key) => (
                settings.lowStimulation
                  ? <CalmMeasurement key={key} metric={key} metrics={metrics} baselineValue={baseline?.[key]?.mean ?? null} days={detection?.windowDays ?? 4} />
                  : <MetricChart key={key} metric={key} metrics={metrics} baselineValue={baseline?.[key]?.mean ?? null} />
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-line pt-8">
            <Link href="/explain" className="btn btn-lg btn-primary">
              {t("insights.helpMeExplain")}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
