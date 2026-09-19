"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { ChangeBanner } from "@/components/insights/ChangeBanner";
import { WhyAmISeeingThis } from "@/components/insights/WhyAmISeeingThis";
import { MetricChart } from "@/components/insights/MetricChart";
import { HelpTip } from "@/components/HelpTip";
import { METRICS, METRIC_ORDER } from "@/lib/health/metrics";
import { baselineByPhase } from "@/lib/health/baseline";

export default function InsightsPage() {
  const { loading, metrics, detection, baseline } = useHealthData();

  // Pain by cycle phase is the clearest illustration of why a flat average
  // would be misleading for this patient.
  const painByPhase = useMemo(
    () => (metrics.length ? baselineByPhase(metrics.slice(0, -4), "painLevel") : []),
    [metrics],
  );

  const flatPainAverage = useMemo(() => {
    const vals = metrics
      .slice(-34, -4)
      .map((m) => m.painLevel)
      .filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [metrics]);

  const currentPhaseBaseline = baseline?.painLevel ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold md:text-4xl">Health Changes</h1>
        <HelpTip topic="changes" />
      </header>

      {loading ? (
        <p className="text-muted">Working out your usual pattern...</p>
      ) : (
        <>
          {detection?.triggered ? (
            <ChangeBanner detection={detection} showLink={false} />
          ) : (
            <section className="card flex flex-wrap items-center gap-3 border-2 p-5">
              <CheckCircle2 className="h-7 w-7 text-good" aria-hidden />
              <div>
                <h2 className="text-xl font-bold">Nothing unusual right now</h2>
                <p className="text-muted">
                  Your recent days look like your own usual pattern. CareBridge will tell
                  you if several things move away from it at the same time.
                </p>
              </div>
              {detection && <WhyAmISeeingThis detection={detection} />}
            </section>
          )}

          {/* --- Why the cycle phase matters ------------------------------ */}
          <section className="card p-5" aria-labelledby="baseline-heading">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="baseline-heading" className="text-2xl font-bold">
                What is normal for you
              </h2>
              <HelpTip topic="cyclePhase" />
            </div>

            <p className="mt-2 text-lg">
              CareBridge does not compare you with other people. It compares you with
              yourself &mdash; and because some symptoms move with your cycle, it compares
              this week with the <strong>same part</strong> of your previous cycles.
            </p>

            {painByPhase.length > 0 && (
              <>
                <h3 className="mt-5 text-lg font-bold">Your usual pain, by cycle phase</h3>
                <ul className="mt-2 space-y-2">
                  {painByPhase.map((p) => {
                    const pct = (p.mean / 10) * 100;
                    const isCurrent = p.phase === detection?.phase;
                    return (
                      <li key={p.phase} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm font-semibold capitalize">
                          {p.phase}
                        </span>
                        <span className="h-6 flex-1 overflow-hidden rounded-full bg-raised">
                          <span
                            className={isCurrent ? "block h-full bg-brand" : "block h-full bg-muted"}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-28 shrink-0 text-sm">
                          {METRICS.painLevel.format(p.mean)}
                          {isCurrent && <span className="ml-1 font-semibold">(now)</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {flatPainAverage !== null && currentPhaseBaseline && (
                  <p className="mt-4 rounded-xl bg-brand-soft p-4">
                    A simple 30-day average of your pain would be{" "}
                    <strong>{METRICS.painLevel.format(flatPainAverage)}</strong>, but during
                    your <strong>{detection?.phase}</strong> phase your usual level is
                    actually{" "}
                    <strong>{METRICS.painLevel.format(currentPhaseBaseline.mean)}</strong>.
                    Using the flat average would make an ordinary week look like a change.
                    That is why CareBridge compares cycle phase to cycle phase.
                  </p>
                )}
              </>
            )}
          </section>

          {/* --- The measurements themselves ------------------------------ */}
          <section className="card p-5" aria-labelledby="charts-heading">
            <h2 id="charts-heading" className="text-2xl font-bold">
              Your measurements
            </h2>
            <p className="mt-1 text-muted">
              The dotted line is your own usual level for this part of your cycle.
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {METRIC_ORDER.map((key) => (
                <MetricChart
                  key={key}
                  metric={key}
                  metrics={metrics}
                  baselineValue={baseline?.[key]?.mean ?? null}
                />
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/explain" className="btn btn-lg btn-primary">
              Help me explain this to my doctor
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
