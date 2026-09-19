"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/components/a11y/useT";

/*
  The small circled i next to features whose name does not explain them.
  Written for someone who is not comfortable with technology: what it is, then
  what they have to do about it — which is usually nothing.

  Copy lives in lib/i18n/messages.ts under helpTips.<topic>, one entry per
  key below.
*/

const TOPICS = ["timeline", "baseline", "cyclePhase", "changes", "explain", "speakForMe", "clinician"] as const;
type Topic = (typeof TOPICS)[number];
type HelpTopicText = { title: string; what: string; how: string };

export function HelpTip({ topic, className }: { topic: Topic | string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const { t, tRaw } = useT();
  const help = TOPICS.includes(topic as Topic) ? tRaw<HelpTopicText>(`helpTips.${topic}`) : undefined;

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
              <span className="sr-only">{t("helpTip.close")}</span>
            </button>
          </div>
          <p className="mt-2 text-sm">{help.what}</p>
          <p className="label mt-3">{t("helpTip.howToUse")}</p>
          <p className="mt-1 text-sm">{help.how}</p>
        </div>
      )}
    </div>
  );
}
