"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { TrendDetection } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";
import { WhyAmISeeingThis } from "./WhyAmISeeingThis";

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
  if (!detection.triggered) return null;

  const names = detection.signals.map((s) => METRICS[s.metric].label.toLowerCase());
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
      : names[0];

  return (
    <section
      className="card border-2 border-warn bg-warn-soft p-5 md:p-6"
      aria-labelledby="change-heading"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-1 h-7 w-7 shrink-0 text-warn" aria-hidden />
        <div className="min-w-0">
          <h2 id="change-heading" className="text-2xl font-bold">
            We noticed a change
          </h2>
          <p className="mt-1 text-lg">
            Several parts of your health information have moved away from your usual
            pattern at the same time: {list}.
          </p>
          <p className="mt-2 text-muted">
            This is not a diagnosis. It is a comparison with your own earlier
            information, and it may be worth mentioning to your doctor.
          </p>

          <WhyAmISeeingThis detection={detection} />

          {showLink ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/insights" className="btn btn-md btn-secondary">
                See the details
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/explain" className="btn btn-md btn-primary">
                Help me explain this
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
