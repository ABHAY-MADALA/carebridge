import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { HealthEvent, type DailyMetric } from "../lib/schema";
import { describeOnset } from "../lib/health/onset";
import { buildSummary, summaryForDisplay, summaryHasContent, summaryToText } from "../lib/health/summary";
import { measurementComparison } from "../lib/health/measurementComparison";
import { TimerClock } from "../lib/body/TimerClock";
import { messages } from "../lib/i18n/messages";
import { BODY_REGIONS, baseBodyLocation, bodyRegionAt, bodySurfaceAt, preciseBodyLocation } from "../lib/body/regions";

const now = new Date("2026-09-19T12:00:00");
const event = (date: string, onset: string | null = null, occurredAt = date) => HealthEvent.parse({ id: date, label: "Abdominal pain", category: "pain", recordedAt: date, occurredAt, onset, inputMethod: "form", severity: 5 });
assert.equal(summaryHasContent(buildSummary([], [], null, now)), false, "an empty generated summary cannot be approved");
const first = event("2026-09-16T12:00:00");
const conflict = [first, event("2026-09-19T11:00:00", "Today")];
const expectedConflict = "I said the abdominal pain started today. I also recorded related symptoms during the previous 3 days.";
const onsetCases: [string, HealthEvent[], string][] = [
  ["conflicting dates", conflict, expectedConflict],
  ["matching dates", [first, event("2026-09-19T11:00:00", "3 days ago")], "The abdominal pain started 3 days ago."],
  ["missing onset", [first], "I first recorded related symptoms 3 days ago."],
  ["onset without earlier records", [event("2026-09-19T11:00:00", "Yesterday")], "I said the abdominal pain started yesterday."],
  ["onset without occurrence timing", [event("2026-09-19T11:00:00", "Yesterday", "invalid")], "I said the abdominal pain started yesterday."],
  ["no records", [], "I’m not sure when it started."],
  ["unreliable timing", [event("invalid")], "I’m not sure when it started."],
  ["approximate week", [event("2026-09-19T11:00:00", "about a week ago")], "I said the abdominal pain started about a week ago."],
  ["vague days", [event("2026-09-19T11:00:00", "A few days ago")], "I said the abdominal pain started a few days ago."],
  ["approximate matching date stays uncertain", [first, event("2026-09-19T11:00:00", "about 3 days ago")], "I said the abdominal pain started about 3 days ago."],
  ["multiple earlier records", [first, event("2026-09-17T11:00:00"), ...conflict], expectedConflict],
  ["singular earlier day", [event("2026-09-18T11:00:00"), conflict[1]], "I said the abdominal pain started today. I also recorded related symptoms during the previous day."],
  ["matching today", [conflict[1]], "The abdominal pain started today."],
  ["matching yesterday", [event("2026-09-18T11:00:00", "Today")], "The abdominal pain started yesterday."],
  ["aged today", [event("2026-09-16T12:00:00", "Today")], "The abdominal pain started 3 days ago."],
  ["aged yesterday", [event("2026-09-18T11:00:00", "Yesterday")], "I said the abdominal pain started 2 days ago."],
  ["aged approximate week", [event("2026-09-18T11:00:00", "about a week ago")], "I said the abdominal pain started about 8 days ago."],
  ["singular approximate day", [event("2026-09-18T11:00:00", "about 0 days ago")], "I said the abdominal pain started about 1 day ago."],
  ["one day wording", [event("2026-09-19T11:00:00", "1 day ago")], "I said the abdominal pain started yesterday."],
  ["plural symptom label", [{ ...conflict[1], label: "Headaches" }], "The headaches started today."],
  ["latest onset wins regardless of input order", [conflict[1], event("2026-09-18T11:00:00", "Yesterday"), first], expectedConflict],
  ["backfilled missing onset", [event("2026-09-19T11:00:00", null, "2026-09-16T12:00:00")], "I first recorded related symptoms today."],
  ["backfilled earlier symptom", [event("2026-09-19T10:00:00", null, "2026-09-16T12:00:00"), conflict[1]], "I said the abdominal pain started today. I also recorded related symptoms from 3 days ago."],
  ["missing onset yesterday", [event("2026-09-18T11:00:00")], "I first recorded related symptoms yesterday."],
  ["unanchored onset", [event("invalid", "Yesterday")], "I described the start as “Yesterday” at the time."],
  ["future record ignored", [event("2026-09-20T11:00:00", "Today")], "I’m not sure when it started."],
];
for (const [name, records, expected] of onsetCases) {
  const actual = describeOnset(records, now);
  assert.equal(actual, expected, name);
  assert.ok(actual.split(/[.!?]+/).filter(s => s.trim()).length <= 2, `${name}: two sentences maximum`);
  assert.ok(actual.split(/\s+/).length <= 30, `${name}: concise wording`);
  assert.doesNotMatch(actual, /Related entries span|do not establish|by my records|database|continuous/i);
  const durations = actual.match(/\d+ days?/g) ?? [];
  assert.equal(new Set(durations).size, durations.length, `${name}: no repeated duration`);
}
assert.equal(describeOnset([event("2026-09-18T23:59:00", "Today")], new Date("2026-09-19T00:01:00")), "The abdominal pain started yesterday.", "calendar day, not elapsed 24 hours");

const summary = buildSummary(conflict, [], null, now);
const legacy = { ...summary, approved: true, sections: summary.sections.map(s => s.id === "started" ? { ...s, body: "It started today — about 3 days ago by my records." } : s) };
const original = JSON.stringify(legacy);
const display = summaryForDisplay(legacy, conflict)!;
assert.equal(JSON.stringify(legacy), original, "display correction must not mutate saved summary");
assert.equal(display.approved, true);
assert.doesNotMatch(summaryToText(display), /— about/);
assert.equal(summary.sections.find(s => s.id === "started")?.body, expectedConflict);
assert.equal(display.sections.find(s => s.id === "started")?.body, expectedConflict);
assert.ok(summaryToText(display).includes(`When it started. ${expectedConflict}`), "full speech uses the same onset");
const verbose = { ...legacy, sections: legacy.sections.map(s => s.id === "started" ? { ...s, body: "Abdominal pain: I said it started today, although related symptoms appear in my timeline from 3 days ago. I first recorded them 3 days ago. Related entries span 3 days; they do not establish that symptoms were continuous." } : s) };
const corrected = summaryForDisplay(verbose, conflict)!;
assert.equal(corrected.sections.find(s => s.id === "started")?.body, expectedConflict);
assert.equal(summaryToText(corrected), summaryToText(display));
assert.equal(summaryToText(JSON.parse(JSON.stringify(corrected))), summaryToText(corrected), "serialized/shared summary retains wording");
const section = corrected.sections.find(s => s.id === "started")!;
assert.equal(`${section.heading}. ${section.body.replace(/^- /gm, "")}`, `When it started. ${expectedConflict}`, "per-section read-aloud wording");
assert.equal(summaryForDisplay(summary, conflict), summary, "new summaries need no correction");
const edited = { ...summary, sections: summary.sections.map(s => ({ ...s, body: "My own words" })) };
assert.equal(summaryForDisplay(edited, conflict), edited, "patient edits preserved");

const metrics = [1,2,3,4,5].map((n) => ({ date: `2026-09-${10+n}`, painLevel: n, steps: n * 1000, sleepMinutes: null })) as DailyMetric[];
assert.deepEqual(measurementComparison(metrics, "painLevel", 2, 4), { recent: 3.5, direction: "higher", count: 4 });
assert.equal(measurementComparison(metrics, "steps", 6000).direction, "lower");
assert.equal(measurementComparison(metrics, "painLevel", 3.5).direction, "same");
assert.equal(measurementComparison(metrics, "sleepMinutes", 400).recent, null);
assert.equal(measurementComparison([], "painLevel", null).direction, "unknown");
assert.equal(measurementComparison([...metrics].reverse(), "painLevel", 2).recent, 3.5);

const originalNow = performance.now;
let time = 1000;
Object.defineProperty(performance, "now", { configurable: true, value: () => time });
try {
  const clock = new TimerClock();
  assert.equal(clock.getDelta(), 0);
  time += 250;
  assert.equal(clock.getDelta(), .25);
  time += 500;
  assert.equal(clock.getElapsedTime(), .75);
  clock.stop(); time += 2000;
  assert.equal(clock.getDelta(), 0);
  clock.start(); time += 100;
  assert.ok(Math.abs(clock.getDelta() - .1) < 1e-8);
  assert.ok(Math.abs(clock.elapsedTime - .1) < 1e-8);
} finally { Object.defineProperty(performance, "now", { configurable: true, value: originalNow }); }
const require = createRequire(import.meta.url);
const loader = require("./fiber-timer-loader.cjs");
assert.match(loader("const clock = new THREE.Clock();"), /TimerClock/);
assert.match(loader("const clock = new THREE__namespace.Clock();"), /TimerClock/);
assert.throws(() => loader("const clock = new THREE.Timer();"));

for (const lang of ["en", "es"] as const) assert.ok(messages[lang].nav.guidedCheckIn);
assert.equal(messages.en.nav.tell, "Talk or type");
assert.equal(messages.en.nav.insights, "Health Changes");
assert.equal(messages.en.nav.explain, "Help Me Explain");
const aiInboxSource = readFileSync("components/health/AIConversationInbox.tsx", "utf8");
assert.match(aiInboxSource, /Live AI connections · Planned/);
assert.match(aiInboxSource, /The live connection is not active in this local demo/);
assert.match(aiInboxSource, /Approve sending the health detail/);
assert.doesNotMatch(readFileSync("components/health/ProfileControls.tsx", "utf8"), /offline deterministic assistant/);
assert.equal(messages.en.bodyPicture.addToTimeline, "Add to Timeline");
assert.doesNotMatch(readFileSync("app/body-picture/page.tsx", "utf8"), /Save to Timeline/);
assert.doesNotMatch(readFileSync("components/manual/ManualEntry.tsx", "utf8"), /CATEGORY_EMOJI/);
assert.match(readFileSync("components/ui/EntryActions.tsx", "utf8"), /Keep entry/);
assert.ok(BODY_REGIONS.some((region) => region.id === "Left pelvis"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Right pelvis"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Left armpit"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Right armpit"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Left ear"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Right ear"));
assert.ok(BODY_REGIONS.some((region) => region.id === "Center face"));
assert.equal(bodyRegionAt({ x: -.11, y: .92 }, 1), "Right pelvis");
assert.equal(bodyRegionAt({ x: .11, y: .92 }, 1), "Left pelvis");
assert.equal(bodyRegionAt({ x: 0, y: .92 }, 1), "Center pelvis");
assert.equal(bodyRegionAt({ x: -.15, y: 1.36 }, 1), "Right chest");
assert.equal(bodyRegionAt({ x: -.24, y: 1.36 }, 1), "Right shoulder");
assert.equal(bodyRegionAt({ x: -.12, y: .70 }, 1), "Right thigh");
assert.equal(bodyRegionAt({ x: -.12, y: .30 }, 1), "Right lower leg");
assert.equal(bodyRegionAt({ x: .10, y: 1.30 }, -.8), "Left upper back");
assert.equal(bodyRegionAt({ x: -.19, y: 1.34 }, 1), "Right armpit");
assert.equal(bodyRegionAt({ x: .19, y: 1.34 }, 1), "Left armpit");
assert.equal(bodyRegionAt({ x: -.062, y: 1.67 }, .1), "Right ear");
assert.equal(bodyRegionAt({ x: .062, y: 1.67 }, .1), "Left ear");
assert.equal(bodyRegionAt({ x: -.035, y: 1.66 }, 1), "Right face");
assert.equal(bodyRegionAt({ x: 0, y: 1.66 }, 1), "Center face");
assert.equal(bodyRegionAt({ x: 0, y: 1.78 }, 1), "Head");
assert.equal(preciseBodyLocation("Left thigh", "back"), "Back of left thigh");
assert.equal(preciseBodyLocation("Right lower leg", "front"), "Front of right lower leg");
assert.equal(preciseBodyLocation("Left thigh", "left"), "Left side of left thigh");
assert.equal(preciseBodyLocation("Right thigh", "right"), "Right side of right thigh");
assert.equal(preciseBodyLocation("Left upper back", "back"), "Left upper back");
assert.equal(baseBodyLocation("Back of left thigh"), "Left thigh");
assert.equal(bodySurfaceAt({ x: 0, z: -.8 }), "back");
assert.equal(bodySurfaceAt({ x: .8, z: 0 }), "left");
assert.match(messages.en.bodyPicture.locationRecorded, /location/i);
assert.match(readFileSync("app/body-picture/page.tsx", "utf8"), /recordedLocation,[\s\S]*descriptors/);
assert.match(readFileSync("app/body-picture/page.tsx", "utf8"), /Describe with your voice/);
const anatomySource = readFileSync("components/body/AnatomyMap.tsx", "utf8");
assert.ok(anatomySource.lastIndexOf('region("Right armpit"') > anatomySource.lastIndexOf('region("Right chest"'));
console.log("UI regression checks passed: onset, legacy display, measurement values, Timer timing, guarded dependency transform, labels and action contracts.");
