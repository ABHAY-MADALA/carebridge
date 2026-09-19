"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";

/*
  Three screens, then out of the way. Onboarding that runs to fifteen screens
  is a tax on exactly the people HealthThread is for.

  Doesn't auto-open when Low Stimulation is on — hiding it after mount would
  still steal focus/layout for a moment, so the fix is not opening it at all.
*/

const KEY = "carebridge.tutorial.seen.v1";

type Screen = { title: string; body: string };

export function Tutorial() {
  const { settings, ready } = useSettings();
  const { t, tRaw } = useT();
  const screens = tRaw<Screen[]>("tutorial.screens");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!ready || settings.lowStimulation) return;
    try {
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* private browsing — just skip the tutorial */
    }
  }, [ready, settings.lowStimulation]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "yes");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const screen = screens[index];
  const last = index === screens.length - 1;

  return (
    <section
      className="card border-2 border-brand p-5 md:p-6"
      role="region"
      aria-labelledby="tutorial-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="tutorial-heading" className="text-2xl font-bold md:text-3xl">
            {t("tutorial.welcomeTitle")}
          </h2>
          <p className="text-lg text-muted">{t("tutorial.welcomeSubtitle")}</p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={dismiss}>
          <X className="h-5 w-5" aria-hidden />
          {t("tutorial.skip")}
        </button>
      </div>

      <div className="mt-5 rounded-xl bg-raised p-5" aria-live="polite">
        <p className="label">{t("tutorial.stepOf", { step: index + 1, total: screens.length })}</p>
        <h3 className="mt-1 text-xl font-bold">{screen.title}</h3>
        <p className="mt-1 text-lg">{screen.body}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {index > 0 ? (
          <button type="button" className="btn btn-md btn-secondary" onClick={() => setIndex((i) => i - 1)}>
            {t("tutorial.back")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-lg btn-primary"
          onClick={() => (last ? dismiss() : setIndex((i) => i + 1))}
        >
          {last ? t("tutorial.start") : t("tutorial.next")}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>

        <ol className="ml-auto flex gap-1.5" aria-hidden>
          {screens.map((_, i) => (
            <li
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i === index ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
