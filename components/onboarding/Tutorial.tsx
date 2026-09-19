"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

/*
  Three screens, then out of the way. Onboarding that runs to fifteen screens
  is a tax on exactly the people CareBridge is for.
*/

const KEY = "carebridge.tutorial.seen.v1";

const SCREENS = [
  {
    step: "1",
    title: "Tell CareBridge",
    body: "Talk, type, or use pictures to tell us what is happening. You do not need the right words.",
  },
  {
    step: "2",
    title: "CareBridge organises it",
    body: "What you say becomes a health timeline that stays with you over time, so nothing gets forgotten.",
  },
  {
    step: "3",
    title: "Help your doctor understand",
    body: "When you are ready, CareBridge writes a summary that you control, change, and approve before sharing.",
  },
];

export function Tutorial() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* private browsing — just skip the tutorial */
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "yes");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const screen = SCREENS[index];
  const last = index === SCREENS.length - 1;

  return (
    <section
      className="card border-2 border-brand p-5 md:p-6"
      role="region"
      aria-labelledby="tutorial-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="tutorial-heading" className="text-2xl font-bold md:text-3xl">
            Welcome to CareBridge
          </h2>
          <p className="text-lg text-muted">Your health. Your way of communicating.</p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={dismiss}>
          <X className="h-5 w-5" aria-hidden />
          Skip
        </button>
      </div>

      <div className="mt-5 rounded-xl bg-raised p-5" aria-live="polite">
        <p className="label">Step {screen.step} of {SCREENS.length}</p>
        <h3 className="mt-1 text-xl font-bold">{screen.title}</h3>
        <p className="mt-1 text-lg">{screen.body}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {index > 0 ? (
          <button type="button" className="btn btn-md btn-secondary" onClick={() => setIndex((i) => i - 1)}>
            Back
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-lg btn-primary"
          onClick={() => (last ? dismiss() : setIndex((i) => i + 1))}
        >
          {last ? "Start CareBridge" : "Next"}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>

        <ol className="ml-auto flex gap-1.5" aria-hidden>
          {SCREENS.map((_, i) => (
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
