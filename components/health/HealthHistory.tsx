"use client";

import { useMemo } from "react";
import { ClipboardList, Hand, Keyboard, Mic, Stethoscope } from "lucide-react";
import { useT } from "@/components/a11y/useT";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { EntryActions } from "@/components/ui/EntryActions";
import { TimelineEntry } from "@/components/ui/TimelineEntry";
import { dateKeyOf, formatDayHeading, formatTime } from "@/lib/dates";
import { METRICS } from "@/lib/health/metrics";
import type { DailyMetric, HealthEvent, InputMethod } from "@/lib/schema";

const METHOD_ICON: Record<InputMethod, typeof Mic> = {
  voice: Mic,
  text: Keyboard,
  visual: Hand,
  form: ClipboardList,
  clinician: Stethoscope,
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${String(remainder).padStart(2, "0")}m` : `${remainder}m`;
}

function EventRow({ event, onDelete, last }: { event: HealthEvent; onDelete: (id: string) => Promise<void>; last: boolean }) {
  const { t, tRaw } = useT();
  const severityWords = tRaw<string[]>("severityScale.words");
  const MethodIcon = METHOD_ICON[event.inputMethod];

  return (
    <TimelineEntry
      last={last}
      time={formatTime(event.occurredAt)}
      trailing={<EntryActions label={event.label} time={formatTime(event.occurredAt)} onRemove={() => onDelete(event.id)} />}
      title={<span className="inline-flex items-center gap-2 text-base">{event.label}</span>}
      meta={
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {event.severity !== null && (
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">{event.severity}/10</span>
              <span className="text-muted">{severityWords[event.severity]}</span>
            </span>
          )}
          {event.bodyLocation && <span className="text-muted">{event.bodyLocation}</span>}
          {event.durationMinutes ? <span className="text-muted">{formatDuration(event.durationMinutes)}</span> : null}
          {event.pattern && <span className="text-muted">{event.pattern}</span>}
          {event.trendHint === "worse" && <span className="font-semibold text-warn">{t("timeline.gettingWorse")}</span>}
          {event.trendHint === "better" && <span className="font-semibold text-good">{t("timeline.gettingBetter")}</span>}
        </div>
      }
      quote={event.originalInput || undefined}
      source={
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <MethodIcon className="h-3.5 w-3.5" aria-hidden />
          {t(`timeline.methodIcon.${event.inputMethod}`)}
          {event.cyclePhase && <span>&middot; {t("timeline.phaseSuffix", { phase: t(`insights.phase.${event.cyclePhase}`) })}</span>}
          {event.translation && <span>&middot; {t("confirmationCard.inEnglish")}: &ldquo;{event.translation}&rdquo;</span>}
        </p>
      }
    />
  );
}

export function HealthHistory({
  events,
  metrics,
  onDelete,
}: {
  events: HealthEvent[];
  metrics: DailyMetric[];
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useT();
  const days = useMemo(() => {
    const byDay = new Map<string, HealthEvent[]>();
    for (const event of events) {
      const key = dateKeyOf(event.occurredAt);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);
  const metricByDate = useMemo(() => new Map(metrics.map((metric) => [metric.date, metric])), [metrics]);

  if (!days.length) return <p className="text-muted">{t("timeline.empty")}</p>;

  return (
    <div className="space-y-10">
      {days.map(([day, dayEvents]) => {
        const metric = metricByDate.get(day);
        return (
          <section key={day} aria-labelledby={`day-${day}`} className="history-day">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id={`day-${day}`} className="text-sm font-semibold uppercase tracking-wide text-muted">
                {formatDayHeading(day)}
              </h3>
              {metric && (metric.sleepMinutes !== null || metric.steps !== null || metric.restingHeartRate !== null) && (
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                  {metric.sleepMinutes !== null && `${METRICS.sleepMinutes.format(metric.sleepMinutes)} ${t("timeline.sleepSuffix")}`}
                  {metric.steps !== null && ` · ${METRICS.steps.format(metric.steps)}`}
                  {metric.restingHeartRate !== null && ` · ${METRICS.restingHeartRate.format(metric.restingHeartRate)} ${t("timeline.restingSuffix")}`}
                  <SourceBadge source={metric.source} />
                </p>
              )}
            </div>
            <ul>
              {dayEvents.map((event, index) => (
                <EventRow key={event.id} event={event} onDelete={onDelete} last={index === dayEvents.length - 1} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
