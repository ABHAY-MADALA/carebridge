"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mic, PersonStanding, Send, Watch, MessageCircle, ClipboardList } from "lucide-react";
import { Tutorial } from "@/components/onboarding/Tutorial";
import { ChangeBanner } from "@/components/insights/ChangeBanner";
import { useHealthData } from "@/components/health/useHealthData";
import { useT } from "@/components/a11y/useT";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TimelineEntry } from "@/components/ui/TimelineEntry";
import { fitbitSource } from "@/lib/health/sources";
import { sendToAssistant } from "@/lib/assistantHandoff";
import { formatDayHeading, formatTime, dateKeyOf } from "@/lib/dates";
import { useEffect } from "react";

const MOODS = [
  { value: "great", prompt: "I'm feeling great today." },
  { value: "okay", prompt: "I'm doing okay today." },
  { value: "not-good", prompt: "I'm not feeling well today." },
  { value: "hard-to-tell", prompt: "I'm not sure how I'm feeling today." },
] as const;

export default function HomePage() {
  const router = useRouter();
  const { loading, events, detection } = useHealthData();
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const [fitbitConnected, setFitbitConnected] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recent = events.slice(0, 4);

  useEffect(() => {
    void fitbitSource.status().then((s) => setFitbitConnected(s.connected));
  }, []);

  const goToAssistant = (text: string, autoSend: boolean) => {
    sendToAssistant(text, autoSend);
    router.push("/tell-carebridge");
  };

  const moodLabels: Record<(typeof MOODS)[number]["value"], string> = {
    great: t("home.moodGreat"),
    okay: t("home.moodOkay"),
    "not-good": t("home.moodNotGood"),
    "hard-to-tell": t("home.moodHardToTell"),
  };

  return (
    <div className="home-page space-y-8">
      <Tutorial />

      <header>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink md:text-3xl">
          {t("home.greeting")}
        </h1>
        <p className="mt-1 text-base text-muted">{t("home.tagline")}</p>
      </header>

      <section aria-label={t("home.moodQuestion")}>
        <p className="mb-3 text-sm font-medium text-ink">{t("home.moodQuestion")}</p>
        <SegmentedControl
          ariaLabel={t("home.moodQuestion")}
          value={null}
          onChange={(v) => {
            const mood = MOODS.find((m) => m.value === v);
            if (mood) goToAssistant(mood.prompt, false);
          }}
          options={MOODS.map((m) => ({ value: m.value, label: moodLabels[m.value] }))}
        />
      </section>

      <section aria-label={t("assistant.whatsGoingOn")}>
        <form
          className="home-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) goToAssistant(draft, true);
          }}
        >
          <label htmlFor="home-entry" className="sr-only">
            {t("assistant.whatsGoingOn")}
          </label>
          <textarea
            id="home-entry"
            ref={inputRef}
            className="min-h-[3.5rem] w-full resize-none border-0 bg-transparent px-3 py-2 text-base text-ink placeholder:text-muted focus:outline-none"
            placeholder={t("assistant.placeholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) goToAssistant(draft, true);
              }
            }}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                sendToAssistant("", false, true);
                router.push("/tell-carebridge");
              }}
            >
              <Mic className="h-4 w-4" aria-hidden />
              {t("assistant.speakInstead")}
            </button>
            <button type="submit" className="btn btn-md btn-primary" disabled={!draft.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              {t("assistant.tellCareBridge")}
            </button>
          </div>
        </form>

        <div className="home-entry-links">
          <Link href="/tell-carebridge" className="text-sm font-medium text-brand hover:underline">
            <MessageCircle aria-hidden />
            {t("home.talkOrType")}
          </Link>
          <Link href="/body-picture" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <PersonStanding className="h-4 w-4" aria-hidden />
            {t("nav.bodyPicture")}
          </Link>
          <Link href="/guided-check-in" className="text-sm font-medium text-brand hover:underline">
            <ClipboardList aria-hidden />
            {t("home.guidedCheckIn")}
          </Link>
        </div>
      </section>

      {!loading && detection?.triggered && <ChangeBanner detection={detection} />}

      <section aria-labelledby="today-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="today-heading" className="text-lg font-semibold text-ink">
            {t("home.recentHeading")}
          </h2>
          <Link href="/timeline" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            {t("home.seeEverything")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted">{t("home.loadingHealth")}</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted">{t("home.nothingRecorded")}</p>
        ) : (
          <ul>
            {recent.map((e, i) => (
              <TimelineEntry
                key={e.id}
                last={i === recent.length - 1}
                time={`${formatDayHeading(dateKeyOf(e.occurredAt))} · ${formatTime(e.occurredAt)}`}
                title={
                  <span className="inline-flex items-center gap-2">
                    {e.label}
                    {e.severity !== null && <span className="text-muted"> &middot; {e.severity}/10</span>}
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </section>

      {fitbitConnected !== null && (
        <Link
          href="/my-health"
          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:bg-raised"
        >
          <span className="inline-flex items-center gap-2 text-ink">
            <Watch className="h-4 w-4 text-muted" aria-hidden />
            {fitbitConnected ? t("home.fitbitConnectedShort") : t("home.fitbitStatusShort")}
          </span>
          <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
        </Link>
      )}
    </div>
  );
}
