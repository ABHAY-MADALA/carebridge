"use client";

import { useMemo } from "react";
import { Mic, Keyboard, Hand, ClipboardList, Stethoscope } from "lucide-react";
import { EntryActions } from "@/components/ui/EntryActions";
import type { HealthEvent, InputMethod } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { HelpTip } from "@/components/HelpTip";
import { useT } from "@/components/a11y/useT";
import { PageHeader } from "@/components/ui/PageHeader";
import { TimelineEntry } from "@/components/ui/TimelineEntry";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { dateKeyOf, formatDayHeading, formatTime } from "@/lib/dates";
import { METRICS } from "@/lib/health/metrics";

/*
  The timeline turns isolated notes into a longitudinal story. It is the thing
  that makes an appointment months from now survivable: nobody has to remember
  what happened in week three.
*/

const METHOD_ICON: Record<InputMethod, typeof Mic> = {
  voice: Mic,
  text: Keyboard,
  visual: Hand,
  form: ClipboardList,
  clinician: Stethoscope,
};

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function EventRow({ event, onDelete, last }: { event: HealthEvent; onDelete: (id: string) => Promise<void>; last: boolean }) {
  const { t, tRaw } = useT();
  const severityWords = tRaw<string[]>("severityScale.words");
  const MethodIcon = METHOD_ICON[event.inputMethod];
  const methodLabel = t(`timeline.methodIcon.${event.inputMethod}`);

  return (
    <TimelineEntry
      last={last}
      time={formatTime(event.occurredAt)}
      trailing={
        <EntryActions label={event.label} time={formatTime(event.occurredAt)} onRemove={() => onDelete(event.id)} />
      }
      title={
        <span className="inline-flex items-center gap-2 text-base">
          {event.label}
        </span>
      }
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
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <MethodIcon className="h-3.5 w-3.5" aria-hidden />
          {methodLabel}
          {event.cyclePhase && (
            <span>&middot; {t("timeline.phaseSuffix", { phase: t(`insights.phase.${event.cyclePhase}`) })}</span>
          )}
          {event.translation && (
            <span>&middot; {t("confirmationCard.inEnglish")}: &ldquo;{event.translation}&rdquo;</span>
          )}
        </p>
      }
    />
  );
}

export default function TimelinePage() {
  const { loading, events, metrics, deleteEvent } = useHealthData();
  const { t } = useT();

  const days = useMemo(() => {
    const byDay = new Map<string, HealthEvent[]>();
    for (const e of events) {
      const key = dateKeyOf(e.occurredAt);
      byDay.set(key, [...(byDay.get(key) ?? []), e]);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  const metricByDate = useMemo(() => new Map(metrics.map((m) => [m.date, m])), [metrics]);

  return (
    <div>
      <PageHeader
        title={t("nav.timeline")}
        description={t("timeline.subtitle")}
        actions={<HelpTip topic="timeline" />}
      />

      {loading ? (
        <p className="text-muted">{t("timeline.loading")}</p>
      ) : days.length === 0 ? (
        <p className="text-lg text-muted">{t("timeline.empty")}</p>
      ) : (
        <div className="space-y-10">
          {days.map(([day, dayEvents]) => {
            const m = metricByDate.get(day);
            return (
              <section key={day} aria-labelledby={`day-${day}`}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 id={`day-${day}`} className="text-sm font-semibold uppercase tracking-wide text-muted">
                    {formatDayHeading(day)}
                  </h2>
                  {m && (m.sleepMinutes !== null || m.steps !== null || m.restingHeartRate !== null) && (
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      {m.sleepMinutes !== null && `${METRICS.sleepMinutes.format(m.sleepMinutes)} ${t("timeline.sleepSuffix")}`}
                      {m.steps !== null && ` · ${METRICS.steps.format(m.steps)}`}
                      {m.restingHeartRate !== null &&
                        ` · ${METRICS.restingHeartRate.format(m.restingHeartRate)} ${t("timeline.restingSuffix")}`}
                      <SourceBadge source={m.source} />
                    </p>
                  )}
                </div>

                <ul>
                  {dayEvents.map((e, i) => (
                    <EventRow key={e.id} event={e} onDelete={deleteEvent} last={i === dayEvents.length - 1} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
