"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/*
  The small circled i next to features whose name does not explain them.
  Written for someone who is not comfortable with technology: what it is, then
  what they have to do about it — which is usually nothing.
*/

export const HELP_TEXT: Record<string, { title: string; what: string; how: string }> = {
  timeline: {
    title: "What is my Timeline?",
    what: "Your timeline is everything you have told CareBridge, in the order it happened. It stays here, so months from now you can still see what was going on this week.",
    how: "You do not need to do anything. Every time you tell CareBridge something, it appears here by itself.",
  },
  baseline: {
    title: "What is my Personal Baseline?",
    what: "CareBridge learns what your health usually looks like, and compares recent information with your own earlier patterns. It does not compare you with other people.",
    how: "Nothing to do. Keep recording how you feel and CareBridge works it out.",
  },
  cyclePhase: {
    title: "Why does my cycle matter?",
    what: "Some symptoms come and go with your cycle, so the same pain level can be normal one week and unusual the next. CareBridge compares this week with the same part of your previous cycles, not with a simple monthly average.",
    how: "Nothing to do. Recording when your period starts makes this more accurate.",
  },
  changes: {
    title: "What are Health Changes?",
    what: "CareBridge looks at several things together, such as pain, tiredness, sleep, activity and heart rate. It only tells you when a few of them move away from your usual pattern at the same time, because one number on its own often means nothing.",
    how: "If you see a change, you can open it to see exactly which numbers moved. CareBridge does not tell you what it means, and it does not diagnose anything.",
  },
  explain: {
    title: "What is Help Me Explain?",
    what: "CareBridge writes a short summary of what has been happening, using only the information you recorded, so you do not have to remember it all at the appointment.",
    how: "Read it, change anything you want, remove anything you would rather not share, then approve it. Nothing is shared until you approve it.",
  },
  speakForMe: {
    title: "What is Speak for Me?",
    what: "CareBridge reads your approved summary out loud, in the first person, as if you were saying it. It can also answer questions your doctor asks, using only what is in your record.",
    how: "Press the button when you are with your doctor. You can stop it at any time, and you can always see on screen what is being said.",
  },
  clinician: {
    title: "What does my doctor see?",
    what: "A clean page with your approved summary, your own words, and the measurements behind it. It is clearly labelled as information you provided.",
    how: "Approve your summary first. Then hand over your phone or laptop.",
  },
};

export function HelpTip({ topic, className }: { topic: keyof typeof HELP_TEXT | string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const help = HELP_TEXT[topic];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!help) return null;

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-line text-muted hover:bg-raised"
      >
        <Info className="h-5 w-5" aria-hidden />
        <span className="sr-only">{help.title}</span>
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={help.title}
          className="card fade-up absolute left-0 top-11 z-30 w-[min(22rem,80vw)] p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold">{help.title}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-sm btn-ghost !min-h-[2rem] px-2"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <p className="mt-2 text-sm">{help.what}</p>
          <p className="label mt-3">How do I use this?</p>
          <p className="mt-1 text-sm">{help.how}</p>
        </div>
      )}
    </div>
  );
}
