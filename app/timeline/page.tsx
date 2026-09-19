"use client";

import { useMemo } from "react";
import { Mic, Keyboard, Hand, ClipboardList, Stethoscope, Trash2 } from "lucide-react";
import type { HealthEvent, InputMethod } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { HelpTip } from "@/components/HelpTip";
import { CATEGORY_EMOJI, severityFace, severityWord } from "@/lib/health/categories";
import { dateKeyOf, formatDayHeading, formatTime } from "@/lib/dates";
import { METRICS } from "@/lib/health/metrics";

/*
  The timeline turns isolated notes into a longitudinal story. It is the thing
  that makes an appointment months from now survivable: nobody has to remember
  what happened in week three.
*/

const METHOD_ICON: Record<InputMethod, { icon: typeof Mic; label: string }> = {
  voice: { icon: Mic, label: "Spoken" },
  text: { icon: Keyboard, label: "Typed" },
  visual: { icon: Hand, label: "Body map" },
  form: { icon: ClipboardList, label: "Chosen from a list" },
  clinician: { icon: Stethoscope, label: "From my doctor" },
};

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function EventCard({
  event,
  onDelete,
}: {
  event: HealthEvent;
  onDelete: (id: string) => void;
}) {
  const method = METHOD_ICON[event.inputMethod];
  const MethodIcon = method.icon;

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span aria-hidden className="text-2xl">
          {CATEGORY_EMOJI[event.category]}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="text-lg font-bold">{event.label}</p>
            <p className="text-sm text-muted">{formatTime(event.occurredAt)}</p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            {event.severity !== null && (
              <p className="flex items-center gap-2">
                <span aria-hidden className="text-xl">
                  {severityFace(event.severity)}
                </span>
                <span className="font-semibold">{event.severity}/10</span>
                <span className="text-muted">{severityWord(event.severity)}</span>
              </p>
            )}
            {event.bodyLocation && <p className="text-muted">{event.bodyLocation}</p>}
            {event.durationMinutes ? (
              <p className="text-muted">{formatDuration(event.durationMinutes)}</p>
            ) : null}
            {event.pattern && <p className="text-muted">{event.pattern}</p>}
            {event.trendHint === "worse" && (
              <p className="font-semibold text-warn">Getting worse</p>
            )}
            {event.trendHint === "better" && (
              <p className="font-semibold text-good">Getting better</p>
            )}
          </div>

          {/* The patient's own words, kept verbatim and never overwritten. */}
          {event.originalInput && (
            <blockquote className="mt-3 border-l-4 border-line pl-3">
              <p className="italic">&ldquo;{event.originalInput}&rdquo;</p>
              {event.translation && (
                <p className="mt-1 text-sm text-muted">
                  In English: &ldquo;{event.translation}&rdquo;
                </p>
              )}
            </blockquote>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <MethodIcon className="h-4 w-4" aria-hidden />
            {method.label}
            {event.cyclePhase && <span> &middot; {event.cyclePhase} phase</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="btn btn-sm btn-ghost"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className="sr-only">Remove {event.label}</span>
          Remove
        </button>
      </div>
    </li>
  );
}

export default function TimelinePage() {
  const { loading, events, metrics, deleteEvent } = useHealthData();

  const days = useMemo(() => {
    const byDay = new Map<string, HealthEvent[]>();
    for (const e of events) {
      const key = dateKeyOf(e.occurredAt);
      byDay.set(key, [...(byDay.get(key) ?? []), e]);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  const metricByDate = useMemo(
    () => new Map(metrics.map((m) => [m.date, m])),
    [metrics],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold md:text-4xl">My Health Timeline</h1>
        <HelpTip topic="timeline" />
      </header>

      <p className="text-lg text-muted">
        Everything you have told CareBridge, newest first. You did not have to file any
        of it.
      </p>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : days.length === 0 ? (
        <p className="card p-5 text-lg">
          Nothing here yet. Tell CareBridge something and it will appear.
        </p>
      ) : (
        <div className="space-y-8">
          {days.map(([day, dayEvents]) => {
            const m = metricByDate.get(day);
            return (
              <section key={day} aria-labelledby={`day-${day}`}>
                <div className="flex flex-wrap items-baseline gap-x-4 border-b-2 border-line pb-2">
                  <h2 id={`day-${day}`} className="text-xl font-bold uppercase tracking-wide">
                    {formatDayHeading(day)}
                  </h2>
                  {/* Passive measurements for context, clearly separate from
                      what the patient chose to report. */}
                  {m && (
                    <p className="text-sm text-muted">
                      {m.sleepMinutes !== null &&
                        `${METRICS.sleepMinutes.format(m.sleepMinutes)} sleep`}
                      {m.steps !== null && ` \u00B7 ${METRICS.steps.format(m.steps)}`}
                      {m.restingHeartRate !== null &&
                        ` \u00B7 ${METRICS.restingHeartRate.format(m.restingHeartRate)} resting`}
                    </p>
                  )}
                </div>

                <ul className="mt-3 space-y-3">
                  {dayEvents.map((e) => (
                    <EventCard key={e.id} event={e} onDelete={deleteEvent} />
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
