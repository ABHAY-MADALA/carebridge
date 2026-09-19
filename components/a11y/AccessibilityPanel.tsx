"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Settings2, X } from "lucide-react";
import { AccessibilityControls } from "./AccessibilityBar";
import { useT } from "./useT";

/*
  The sidebar's "Accessibility / Settings" entry — one trigger, one popover
  panel, same toggles AccessibilityBar always had. There is no separate
  Settings surface in the app, so that sidebar label and this trigger are
  deliberately the same thing rather than a placeholder page.
*/
export function AccessibilityPanel({ trigger, placement = "above" }: { trigger?: (open: () => void) => React.ReactNode; placement?: "above" | "below" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useT();

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

  return (
    <div ref={ref} className="relative">
      {trigger ? (
        trigger(() => setOpen((o) => !o))
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="btn btn-sm btn-ghost w-full justify-start"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          {t("a11yBar.heading")}
        </button>
      )}

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={t("a11yBar.heading")}
          className={`card fade-up absolute z-50 w-[min(22rem,85vw)] max-h-[70vh] overflow-auto p-4 shadow-lg ${placement === "below" ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2"}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="label !text-sm">{t("a11yBar.heading")}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-sm btn-ghost !min-h-[2rem] px-2"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("helpTip.close")}</span>
            </button>
          </div>
          <AccessibilityControls layout="vertical" />
        </div>
      )}
    </div>
  );
}
