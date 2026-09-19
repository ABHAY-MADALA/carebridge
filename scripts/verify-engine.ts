/*
  Sanity check for the parts of HealthThread that must not be wrong: the seeded
  patient, the cycle-aware baseline, and multi-signal detection.

  Run with: npx tsx scripts/verify-engine.ts
*/
import { buildEvents, buildMetrics, DEMO_PATIENT } from "../lib/store/seed";
import { baselineByPhase, computeBaseline } from "../lib/health/baseline";
import { detectTrend, MIN_SIGNALS } from "../lib/health/trends";
import { METRICS, METRIC_ORDER } from "../lib/health/metrics";

const metrics = buildMetrics();
const events = buildEvents();

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}`);
  if (!ok) failures++;
};

console.log(`\nSeed: ${metrics.length} days, ${events.length} events for ${DEMO_PATIENT.name}`);
console.log(`Today is cycle day ${metrics[metrics.length - 1].cycleDay} (${metrics[metrics.length - 1].cyclePhase})\n`);

console.log("Pain baseline by cycle phase (this is the technical argument):");
for (const p of baselineByPhase(metrics.slice(0, -7), "painLevel")) {
  console.log(`  ${p.phase.padEnd(11)} ${p.mean.toFixed(2)}/10  (n=${p.n})`);
}

const detection = detectTrend(metrics);
console.log(`\nDetection over the last ${detection.windowDays} days (phase: ${detection.phase}):`);
for (const s of detection.evaluated) {
  const meta = METRICS[s.metric];
  const isSignal = detection.signals.some((x) => x.metric === s.metric);
  console.log(
    `  ${isSignal ? "*" : " "} ${meta.label.padEnd(20)} ${meta
      .format(s.baselineValue)
      .padStart(12)} -> ${meta.format(s.currentValue).padStart(12)}  ` +
      `${s.deltaPct >= 0 ? "+" : ""}${s.deltaPct.toFixed(1)}%  z=${s.z.toFixed(2)}  ` +
      `[${s.baselineSource}, n=${s.n}]`,
  );
}

console.log("\nAssertions:");
check(detection.triggered, `banner triggers (${detection.signals.length} signals, need ${MIN_SIGNALS})`);
check(
  detection.signals.length === METRIC_ORDER.length,
  `all ${METRIC_ORDER.length} metrics register as signals`,
);
check(
  detection.evaluated.every((s) => s.baselineSource === "cycle-phase"),
  "every baseline is cycle-phase aware, not a flat average",
);
check(
  detection.evaluated.every((s) => s.n >= 10),
  "each baseline has a usable sample size",
);

// A flat 30-day average would overstate the pain change, because Alex's pain is
// genuinely higher in the luteal phase every month. Show the difference.
const recent30 = metrics.slice(-30, -4);
const flatPain =
  recent30.reduce((a, m) => a + (m.painLevel ?? 0), 0) / recent30.length;
const phasePain = computeBaseline(metrics, "luteal", new Set(metrics.slice(-4).map((m) => m.date)))
  .painLevel!;
console.log(
  `\n  Flat 30-day pain baseline:  ${flatPain.toFixed(2)}/10` +
    `\n  Cycle-aware (luteal):       ${phasePain.mean.toFixed(2)}/10` +
    `\n  -> the naive baseline is ${(phasePain.mean - flatPain).toFixed(2)} points lower, so it would` +
    `\n     exaggerate an ordinary luteal week as a change.`,
);

/*
  The seeded narrative has to agree with the cycle model. A "Period started"
  event that renders as "luteal phase" on the timeline makes the cycle-aware
  baseline look broken to anyone who knows how cycles work.
*/
const periodStart = events.find((e) => e.label === "Period started");
check(
  periodStart?.cyclePhase === "menstrual" && periodStart?.cycleDay === 1,
  `the period-start event falls on cycle day 1 (menstrual) — got day ${periodStart?.cycleDay} / ${periodStart?.cyclePhase}`,
);
check(
  events
    .filter((e) => e.category === "cycle")
    .every((e) => e.cyclePhase === "menstrual"),
  "no cycle event lands outside the menstrual phase",
);
check(
  events.every((e) => {
    const day = metrics.find((m) => m.date === e.occurredAt.slice(0, 10));
    return !day || day.cyclePhase === e.cyclePhase;
  }),
  "every event's phase matches the daily record for that date",
);

// The demo must not depend on a stale clock: re-running must be identical.
const again = buildMetrics();
check(
  JSON.stringify(again) === JSON.stringify(metrics),
  "seed is deterministic across runs",
);

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
