"use client";

import { ProfileControls } from "@/components/health/ProfileControls";
import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  FileHeart,
  HeartPulse,
  Link2,
} from "lucide-react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";
import { FitbitConnect } from "@/components/health/FitbitConnect";
import { HealthHistory } from "@/components/health/HealthHistory";
import { useHealthData } from "@/components/health/useHealthData";
import { HelpTip } from "@/components/HelpTip";
import { CalmMeasurement } from "@/components/insights/CalmMeasurement";
import { ChangeBanner } from "@/components/insights/ChangeBanner";
import { MetricChart } from "@/components/insights/MetricChart";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDayHeading, dateKeyOf } from "@/lib/dates";
import { baselineByPhase } from "@/lib/health/baseline";
import { METRICS, METRIC_ORDER } from "@/lib/health/metrics";

/** The record and change detection share one home so patients never have to
 * guess whether something belongs under "Timeline" or "Health Changes". */
export default function MyHealthPage() {
  const { loading, error, refresh, events, metrics, timeline, detection, baseline, baselineInfo, deleteEvent } = useHealthData();
  const { settings } = useSettings();
  const { t, lang } = useT();

  const painByPhase = useMemo(
    () => (metrics.length ? baselineByPhase(metrics.slice(0, -4), "painLevel") : []),
    [metrics],
  );

  const flatPainAverage = useMemo(() => {
    const values = metrics
      .slice(-34, -4)
      .map((metric) => metric.painLevel)
      .filter((value): value is number => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }, [metrics]);

  const latest = events[0];
  const latestDay = latest ? formatDayHeading(dateKeyOf(latest.occurredAt)) : null;
  const signalCount = detection?.signals.length ?? 0;

  return (
    <div className="my-health-page">
      <PageHeader
        eyebrow={lang === "es" ? "Tu historia completa" : "Your full health story"}
        title={t("nav.myHealth")}
        description={t("myHealth.subtitle")}
        actions={
          <Link href="/explain" className="btn btn-md btn-primary">
            {t("insights.helpMeExplain")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      <section className="health-snapshot" aria-label={t("myHealth.overviewLabel")}>
        <div>
          <span className="snapshot-icon"><CalendarClock aria-hidden /></span>
          <span><strong>{events.length}</strong><small>{t("myHealth.recordedItems")}</small></span>
        </div>
        <div>
          <span className="snapshot-icon"><ChartNoAxesCombined aria-hidden /></span>
          <span><strong>{metrics.length}</strong><small>{t("myHealth.daysInPattern")}</small></span>
        </div>
        <div>
          <span className="snapshot-icon"><Activity aria-hidden /></span>
          <span><strong>{signalCount}</strong><small>{t("myHealth.recentSignals")}</small></span>
        </div>
      </section>

      {error ? <div role="alert" className="card p-5"><p>{error}</p><button className="btn btn-secondary mt-3" onClick={() => void refresh()}>Try again</button></div> : loading ? (
        <div className="health-loading" role="status">
          <span className="health-loading-bar" />
          <span className="health-loading-bar" />
          <span className="health-loading-bar" />
          <p>{t("timeline.loading")}</p>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          <section id="changes" className="scroll-mt-28" aria-label={t("changeBanner.heading")}>
            {baselineInfo?.status === "building" ? (
              <div className="change-banner p-5"><h2 className="text-lg font-semibold">Building your baseline</h2><p className="mt-1 text-sm text-muted">{baselineInfo.explanation ?? "Record more of your own health information before comparing patterns."}</p></div>
            ) : detection?.triggered ? (
              <ChangeBanner detection={detection} showLink={false} />
            ) : (
              <div className="change-banner no-change">
                <div className="change-banner-summary">
                  <span className="change-banner-icon"><CheckCircle2 aria-hidden /></span>
                  <div>
                    <p className="label mb-1 !text-[0.6875rem] !tracking-[0.14em]">{t("nav.myHealth")}</p>
                    <h2 className="text-lg font-semibold text-ink">{t("insights.nothingUnusualTitle")}</h2>
                    <p className="mt-1 text-sm text-muted">{t("insights.nothingUnusualBody")}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <CollapsibleSection
            id="patterns"
            title={t("myHealth.patternsHeading")}
            summary={t("myHealth.patternsSummary", { count: METRIC_ORDER.length })}
            icon={<ChartNoAxesCombined aria-hidden />}
            help={<HelpTip topic="changes" compact align="right" />}
          >
            <div className="space-y-9">
              <section aria-labelledby="baseline-heading">
                <SectionHeader
                  id="baseline-heading"
                  title={t("insights.normalHeading")}
                  description={t("insights.normalBody")}
                  action={<HelpTip topic="cyclePhase" compact align="right" />}
                />

                {painByPhase.length > 0 && (
                  <div className="phase-comparison">
                    <h3>{t("insights.usualPainHeading")}</h3>
                    <ul>
                      {painByPhase.map((phase) => {
                        const current = phase.phase === detection?.phase;
                        return (
                          <li key={phase.phase}>
                            <span>{t(`insights.phase.${phase.phase}`)}</span>
                            <span className="phase-track"><i className={current ? "is-current" : ""} style={{ width: `${(phase.mean / 10) * 100}%` }} /></span>
                            <span>{METRICS.painLevel.format(phase.mean)}{current && <b>{t("insights.now")}</b>}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {flatPainAverage !== null && baseline?.painLevel && (
                      <p className="phase-note">
                        {t("insights.flatAveragePre")} <strong>{METRICS.painLevel.format(flatPainAverage)}</strong>
                        {t("insights.flatAverageMid")} <strong>{detection?.phase ? t(`insights.phase.${detection.phase}`) : ""}</strong>{" "}
                        {t("insights.flatAveragePhaseSuffix")} <strong>{METRICS.painLevel.format(baseline.painLevel.mean)}</strong>
                        {t("insights.flatAveragePost")}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section aria-labelledby="measurements-heading" className="border-t border-line pt-8">
                <SectionHeader
                  id="measurements-heading"
                  title={t("insights.measurementsHeading")}
                  description={settings.lowStimulation
                    ? (lang === "es"
                      ? `Tu nivel habitual comparado con el promedio de los últimos ${detection?.windowDays ?? 4} días registrados.`
                      : `Your usual level compared with the average of the last ${detection?.windowDays ?? 4} recorded days.`)
                    : t("insights.measurementsSubtitle")}
                />
                <div className="measurement-grid grid gap-4 md:grid-cols-2">
                  {METRIC_ORDER.map((key) => settings.lowStimulation
                    ? <CalmMeasurement key={key} metric={key} metrics={metrics} baselineValue={baseline?.[key]?.mean ?? null} days={detection?.windowDays ?? 4} />
                    : <MetricChart key={key} metric={key} metrics={metrics} baselineValue={baseline?.[key]?.mean ?? null} />)}
                </div>
              </section>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="recent"
            title={t("home.recentHeading")}
            summary={latest ? `${events.length} ${t("myHealth.entries")} · ${latest.label} · ${latestDay}` : t("timeline.empty")}
            icon={<HeartPulse aria-hidden />}
            help={<HelpTip topic="timeline" compact align="right" />}
          >
            <HealthHistory timeline={timeline} onDelete={deleteEvent} />
          </CollapsibleSection>

          <CollapsibleSection
            id="connections"
            title={t("myHealth.connectionsHeading")}
            summary={t("myHealth.connectionsSummary")}
            icon={<Link2 aria-hidden />}
            help={<HelpTip topic="myHealth" compact align="right" />}
          >
            <Link href="/records" className="health-records-link">
              <span><FileHeart aria-hidden /></span>
              <span><strong>{t("myHealth.recordsLink")}</strong><small>{t("myHealth.recordsLinkBody")}</small></span>
              <ArrowRight aria-hidden />
            </Link>
            <FitbitConnect />
            <ProfileControls />
            <div className="mt-8 border-t border-line pt-6">
              <p className="label mb-2">{t("myHealth.future")}</p>
              <ul className="space-y-1 text-sm text-muted">
                <li>{t("myHealth.appleHealth")}</li>
                <li>{t("myHealth.healthConnect")}</li>
              </ul>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
