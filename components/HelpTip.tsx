"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/a11y/useT";

/*
  The small circled i next to features whose name does not explain them.
  Written for someone who is not comfortable with technology: what it is, then
  what they have to do about it — which is usually nothing.

  Copy lives in lib/i18n/messages.ts under helpTips.<topic>, one entry per
  key below.
*/

const TOPICS = [
  "home",
  "tell",
  "bodyPicture",
  "guidedCheckIn",
  "myHealth",
  "records",
  "timeline",
  "baseline",
  "cyclePhase",
  "changes",
  "explain",
  "speakForMe",
  "clinician",
] as const;
type Topic = (typeof TOPICS)[number];
type HelpTopicText = { title: string; what: string; how: string };

export function HelpTip({
  topic,
  className,
  compact = false,
  align = "left",
}: {
  topic: Topic | string;
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { t, tRaw } = useT();
  const help = TOPICS.includes(topic as Topic) ? tRaw<HelpTopicText>(`helpTips.${topic}`) : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !dialogRef.current?.contains(target)
      ) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const placeDialog = () => {
      const trigger = ref.current?.querySelector("button");
      const dialog = dialogRef.current;
      if (!trigger || !dialog) return;

      const margin = 12;
      const gap = 9;
      const triggerRect = trigger.getBoundingClientRect();
      const dialogRect = dialog.getBoundingClientRect();
      let left = align === "left"
        ? triggerRect.left
        : align === "center"
          ? triggerRect.left + triggerRect.width / 2 - dialogRect.width / 2
          : triggerRect.right - dialogRect.width;
      left = Math.max(margin, Math.min(left, window.innerWidth - dialogRect.width - margin));

      let top = triggerRect.bottom + gap;
      if (top + dialogRect.height > window.innerHeight - margin) {
        const above = triggerRect.top - dialogRect.height - gap;
        top = above >= margin ? above : Math.max(margin, window.innerHeight - dialogRect.height - margin);
      }
      setPosition({ left, top });
    };

    placeDialog();
    window.addEventListener("resize", placeDialog);
    window.addEventListener("scroll", placeDialog, true);
    return () => {
      window.removeEventListener("resize", placeDialog);
      window.removeEventListener("scroll", placeDialog, true);
    };
  }, [open, align]);

  if (!help) return null;

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={help.title}
        data-read-aloud-text={`${help.title}. ${help.what} ${t("helpTip.howToUse")} ${help.how}`}
        className={compact ? "help-tip-trigger is-compact" : "help-tip-trigger"}
      >
        <Info className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} aria-hidden />
        <span className="sr-only">{help.title}</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dialogRef}
          id={id}
          role="dialog"
          aria-label={help.title}
          className="help-tip-dialog is-portaled card fade-up"
          style={{ left: position?.left ?? 12, top: position?.top ?? 12, visibility: position ? "visible" : "hidden" }}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
