"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
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
}: {
  detection: TrendDetection;
  showLink?: boolean;
}) {
  const { t } = useT();
  if (!detection.triggered) return null;

  const names = detection.signals.map((s) => METRICS[s.metric].label.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];

  return (
    <section className="rounded-lg border border-line bg-warn-soft p-5 md:p-6" aria-labelledby="change-heading">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
        <div className="min-w-0">
          <h2 id="change-heading" className="text-lg font-semibold text-ink">
            {t("changeBanner.heading")}
          </h2>
          <p className="mt-1 text-base text-ink">{t("changeBanner.body", { list })}</p>
          <p className="mt-1 text-sm text-muted">{t("changeBanner.disclaimer")}</p>

          <WhyAmISeeingThis detection={detection} />

          {showLink ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/insights" className="btn btn-sm btn-secondary">
                {t("changeBanner.seeDetails")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/explain" className="btn btn-sm btn-primary">
                {t("changeBanner.helpExplain")}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
