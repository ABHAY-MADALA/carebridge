"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowRight, ChevronDown } from "lucide-react";
import type { TrendDetection } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";
import { WhyAmISeeingThis } from "./WhyAmISeeingThis";
import { useT } from "@/components/a11y/useT";

/*
  "We noticed a change."

  Carefully worded. It reports that measurements moved together, and nothing
  else. No cause, no condition, no urgency — the patient decides what it means
  to them, and their doctor decides what it means clinically.
*/

export function ChangeBanner({
  detection,
  showLink = true,
  defaultOpen = false,
}: {
  detection: TrendDetection;
  showLink?: boolean;
  defaultOpen?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);
  if (!detection.triggered) return null;

  const names = detection.signals.map((s) => METRICS[s.metric].label.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];

  return (
    <section className={`change-banner ${open ? "is-open" : ""}`} aria-labelledby="change-heading">
      <div className="change-banner-summary">
        <span className="change-banner-icon"><AlertCircle aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="label mb-1 !text-[0.6875rem] !tracking-[0.14em]">{t("nav.myHealth")}</p>
          <h2 id="change-heading" className="text-lg font-semibold text-ink">{t("changeBanner.heading")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted md:text-base">{t("changeBanner.body", { list })}</p>
        </div>
        <button
          type="button"
          className="change-banner-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="change-banner-details"
        >
          <span>{open ? t("myHealth.hideDetails") : t("myHealth.reviewChange")}</span>
          <ChevronDown aria-hidden />
        </button>
      </div>

      {open && (
        <div id="change-banner-details" className="change-banner-details fade-up">
          <p className="text-sm text-muted">{t("changeBanner.disclaimer")}</p>
          <WhyAmISeeingThis detection={detection} defaultOpen />

          <div className="mt-4 flex flex-wrap gap-3">
            {showLink && (
              <Link href="/my-health#patterns" className="btn btn-sm btn-secondary">
                {t("changeBanner.seeDetails")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
            <Link href="/explain" className="btn btn-sm btn-primary">{t("changeBanner.helpExplain")}</Link>
          </div>
        </div>
      )}
    </section>
  );
}
