"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Stethoscope } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ManualEntry } from "@/components/manual/ManualEntry";
import { Tutorial } from "@/components/onboarding/Tutorial";
import { ChangeBanner } from "@/components/insights/ChangeBanner";
import { useHealthData } from "@/components/health/useHealthData";
import { HelpTip } from "@/components/HelpTip";
import { formatDayHeading, dateKeyOf } from "@/lib/dates";
import { CATEGORY_EMOJI } from "@/lib/health/categories";

export default function HomePage() {
  const { loading, events, detection } = useHealthData();
  const recent = events.slice(0, 3);

  return (
    <div className="space-y-6">
      <Tutorial />

      <header>
        <h1 className="text-3xl font-bold md:text-4xl">Hello, Alex</h1>
        <p className="mt-1 text-lg text-muted">
          Your health, in your own words.
        </p>
      </header>

      {/*
        The assistant is the first and largest thing on the page. It is the
        feature that ties accessibility, structuring, the timeline and the
        doctor conversation together, so it gets the space to match.
      */}
      <AssistantPanel />

      {/* An equally valid path for anyone who would rather not talk to an AI. */}
      <section className="card p-5" aria-labelledby="manual-heading">
        <h2 id="manual-heading" className="text-xl font-bold">
          Prefer to choose from a list?
        </h2>
        <p className="mt-1 text-base text-muted">
          You never have to use the assistant. Picking from pictures and buttons records
          exactly the same information.
        </p>
        <div className="mt-4">
          <ManualEntry />
        </div>
      </section>

      {!loading && detection?.triggered && <ChangeBanner detection={detection} />}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="recent-heading">
          <div className="flex items-center gap-2">
            <h2 id="recent-heading" className="text-xl font-bold">
              Recently recorded
            </h2>
            <HelpTip topic="timeline" />
          </div>

          {loading ? (
            <p className="mt-3 text-muted">Loading your health information...</p>
          ) : recent.length === 0 ? (
            <p className="mt-3 text-muted">Nothing recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recent.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span aria-hidden className="text-xl">
                    {CATEGORY_EMOJI[e.category]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {e.label}
                      {e.severity !== null && (
                        <span className="text-muted"> &middot; {e.severity}/10</span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDayHeading(dateKeyOf(e.occurredAt))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link href="/timeline" className="btn btn-md btn-ghost mt-4 px-0">
            <CalendarDays className="h-5 w-5" aria-hidden />
            See everything
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className="card p-5" aria-labelledby="doctor-heading">
          <div className="flex items-center gap-2">
            <h2 id="doctor-heading" className="text-xl font-bold">
              Going to the doctor?
            </h2>
            <HelpTip topic="explain" />
          </div>
          <p className="mt-2 text-base text-muted">
            CareBridge can write a short summary of what has been happening, using only
            what you recorded. You read it, change anything you want, and decide whether
            to share it.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/explain" className="btn btn-md btn-primary">
              <Stethoscope className="h-5 w-5" aria-hidden />
              Help Me Explain
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
