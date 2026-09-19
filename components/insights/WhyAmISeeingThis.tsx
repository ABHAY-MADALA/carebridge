"use client";

import { useState } from "react";
import { ChevronDown, Info, MoveDown, MoveUp } from "lucide-react";
import type { TrendDetection } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";
import { MIN_SIGNALS } from "@/lib/health/trends";
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

  const phaseNote =
    detection.signals[0]?.baselineSource === "cycle-phase"
      ? `the same ${detection.phase} phase of your previous cycles`
      : "your previous days";

  return (
    <div className="mt-4">
      <button
        type="button"
        className="btn btn-md btn-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Info className="h-5 w-5" aria-hidden />
        Why am I seeing this?
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="fade-up mt-3 rounded-xl border-2 border-line bg-surface p-4">
          <p className="text-lg">
            CareBridge compared your last {detection.windowDays} days with{" "}
            <strong>{phaseNote}</strong>.
          </p>

          <table className="mt-4 w-full text-left">
            <caption className="sr-only">
              Your usual measurements compared with the last {detection.windowDays} days
            </caption>
            <thead>
              <tr className="border-b-2 border-line">
                <th scope="col" className="py-2 pr-3">Measurement</th>
                <th scope="col" className="py-2 pr-3">Your usual</th>
                <th scope="col" className="py-2 pr-3">Recently</th>
                <th scope="col" className="py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {detection.evaluated.map((s) => {
                const meta = METRICS[s.metric];
                const isSignal = detection.signals.some((x) => x.metric === s.metric);
                const Arrow = s.direction === "up" ? MoveUp : MoveDown;
                return (
                  <tr key={s.metric} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {meta.label}
                      {isSignal ? null : (
                        <span className="ml-2 text-sm font-normal text-muted">
                          (about the same)
                        </span>
                      )}
                    </th>
                    <td className="py-2 pr-3">{meta.format(s.baselineValue)}</td>
                    <td className={cn("py-2 pr-3", isSignal && "font-bold")}>
                      {meta.format(s.currentValue)}
                    </td>
                    <td className="py-2">
                      {isSignal ? (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Arrow className="h-4 w-4" aria-hidden />
                          <span className="sr-only">
                            {s.direction === "up" ? "up" : "down"}
                          </span>
                          {Math.abs(s.deltaPct).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted">no real change</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-4 text-muted">
            CareBridge only says something when at least {MIN_SIGNALS} measurements move
            away from your usual pattern at the same time. Here,{" "}
            {detection.signals.length} did.
            {detection.signals[0]
              ? ` Your usual figures come from ${detection.signals[0].n} earlier days.`
              : ""}
          </p>

          <p className="mt-2 text-muted">
            This is a comparison with your own past information. It is not a diagnosis,
            and CareBridge is not saying what is causing it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
