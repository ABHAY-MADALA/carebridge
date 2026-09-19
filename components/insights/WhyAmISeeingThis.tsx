"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { TrendDetection } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";
import { MIN_SIGNALS } from "@/lib/health/trends";
import { HealthMetric } from "@/components/ui/HealthMetric";
import { useT } from "@/components/a11y/useT";
import { cn } from "@/lib/utils";

/*
  Explainable by construction.

  This renders the exact TrendDetection object that decided to show the banner.
  It is not a second, prettier description of the reasoning — it IS the
  reasoning, so the explanation cannot quietly drift away from what the code
  actually did.
*/

export function WhyAmISeeingThis({
  detection,
  defaultOpen = false,
}: {
  detection: TrendDetection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useT();

  const phaseNote = detection.phase && detection.signals[0]?.baselineSource === "cycle-phase"
    ? t("whyAmISeeingThis.samePhase", { phase: t(`insights.phase.${detection.phase}`) })
    : t("whyAmISeeingThis.previousDays");

  return (
    <div className="mt-4">
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Info className="h-4 w-4" aria-hidden />
        {t("whyAmISeeingThis.trigger")}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="fade-up mt-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-base">{t("whyAmISeeingThis.comparedTo", { days: detection.windowDays, phrase: phaseNote })}</p>

          <div className="mt-3">
            {detection.evaluated.map((s) => {
              const meta = METRICS[s.metric];
              const isSignal = detection.signals.some((x) => x.metric === s.metric);
              return (
                <HealthMetric
                  key={s.metric}
                  label={isSignal ? meta.label : `${meta.label} ${t("whyAmISeeingThis.aboutTheSame")}`}
                  usual={meta.format(s.baselineValue)}
                  recent={meta.format(s.currentValue)}
                  delta={
                    isSignal
                      ? `${s.direction === "up" ? "↑" : "↓"} ${Math.abs(s.deltaPct).toFixed(0)}%`
                      : undefined
                  }
                  adverse={isSignal}
                  emphasize={isSignal}
                />
              );
            })}
          </div>

          <p className="mt-4 text-sm text-muted">
            {t("whyAmISeeingThis.thresholdNote", { min: MIN_SIGNALS, count: detection.signals.length })}
            {detection.signals[0] ? t("whyAmISeeingThis.sampleNote", { n: detection.signals[0].n }) : ""}
          </p>

          <p className="mt-2 text-sm text-muted">{t("whyAmISeeingThis.notADiagnosis")}</p>
        </div>
      ) : null}
    </div>
  );
}
