import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractDrafts } from "../lib/ai/fallback";
import { draftToEvent } from "../lib/health/createEvent";
import { buildGuidedDraft } from "../lib/health/guidedHistory";

const cycle = buildGuidedDraft(
  "cycle",
  {
    recordType: "period",
    startDate: "2026-09-20",
    flow: "heavy",
    duration: "fourSeven",
    usual: "heavier",
    clots: "large",
    related: ["cramps", "dizzy"],
    pregnancy: "unsure",
    note: "This woke me up twice.",
  },
  "en",
);
assert.equal(cycle.category, "cycle");
assert.equal(cycle.label, "Menstrual bleeding");
assert.equal(cycle.onset, "2026-09-20");
assert.match(cycle.originalInput ?? "", /Heavy/);
assert.match(cycle.originalInput ?? "", /quarter or larger/);
assert.match(cycle.originalInput ?? "", /This woke me up twice/);

const urinary = buildGuidedDraft(
  "urinary",
  {
    symptoms: ["burning", "frequency", "urgency"],
    onset: "today",
    urine: ["cloudy", "smell"],
    related: ["lowerPain"],
    severity: 6,
  },
  "en",
);
assert.equal(urinary.category, "urinary");
assert.equal(urinary.severity, 6);
assert.equal(urinary.onset, "Today");
assert.match(urinary.originalInput ?? "", /Burning or pain when urinating/);
assert.match(urinary.originalInput ?? "", /Cloudy/);

const bowelSpanish = buildGuidedDraft(
  "bowel",
  {
    changes: ["constipation", "incomplete"],
    onset: "fewDays",
    appearance: ["hard"],
    frequency: "noneThree",
    related: ["bellyPain"],
    severity: 4,
  },
  "es",
);
assert.equal(bowelSpanish.category, "bowel");
assert.equal(bowelSpanish.inputLanguage, "es");
assert.match(bowelSpanish.originalInput ?? "", /Duras o difíciles/);
assert.match(bowelSpanish.note ?? "", /Hard or difficult to pass/);

const heart = buildGuidedDraft(
  "condition",
  {
    conditionArea: "heart",
    heartChanges: ["breath", "swelling", "fatigue"],
    onset: "fewDays",
    context: ["activity"],
    severity: 5,
    measurements: "Blood pressure 132/82 from my home cuff this morning.",
  },
  "en",
);
assert.equal(heart.category, "other");
assert.equal(heart.label, "Heart or circulation change");
assert.equal(heart.onset, "A few days ago");
assert.match(heart.originalInput ?? "", /shortness of breath/i);
assert.match(heart.originalInput ?? "", /132\/82/);

const cancerCare = buildGuidedDraft(
  "condition",
  {
    conditionArea: "cancer",
    cancerChanges: ["fatigue", "nausea", "nerve"],
    onset: "today",
    context: ["treatment"],
    severity: 7,
  },
  "en",
);
assert.equal(cancerCare.label, "Cancer care or treatment change");
assert.match(cancerCare.originalInput ?? "", /during or after cancer care/i);
assert.match(cancerCare.originalInput ?? "", /Numbness, tingling/i);

const pcosSpanish = buildGuidedDraft(
  "condition",
  {
    conditionArea: "hormones",
    hormoneChanges: ["cycle", "hair", "skin"],
    onset: "ongoing",
  },
  "es",
);
assert.equal(pcosSpanish.category, "cycle");
assert.equal(pcosSpanish.inputLanguage, "es");
assert.match(pcosSpanish.originalInput ?? "", /SOP/);
assert.match(pcosSpanish.note ?? "", /facial\/body hair/i);

const olderAdult = buildGuidedDraft(
  "condition",
  {
    conditionArea: "memory",
    memoryChanges: ["tasks", "balance", "hearing"],
    onset: "week",
  },
  "en",
);
assert.equal(olderAdult.label, "Memory, balance, vision, or hearing change");
assert.match(olderAdult.originalInput ?? "", /medicine, appointments, money, or travel/i);

const recorded = draftToEvent(cycle, "form", [], new Date("2026-09-22T16:00:00.000Z"));
assert.equal(recorded.occurredAt.slice(0, 10), "2026-09-20");
assert.equal(recorded.originalInput, cycle.originalInput);

const urinaryText = extractDrafts("It burns when I pee and this started today");
assert.equal(urinaryText[0]?.category, "urinary");
const bowelText = extractDrafts("I have had diarrhea since yesterday");
assert.equal(bowelText[0]?.category, "bowel");

const page = readFileSync("app/guided-check-in/page.tsx", "utf8");
const component = readFileSync("components/manual/GuidedHistoryCheckIn.tsx", "utf8");
const copy = readFileSync("lib/health/guidedHistory.ts", "utf8");
assert.match(page, /GuidedHistoryCheckIn/);
assert.match(component, /stage === "review"/);
assert.match(component, /buildGuidedDraft/);
assert.match(component, /conditionArea/);
assert.match(component, /showWhen/);
assert.match(copy, /Review answers/);
assert.match(copy, /Confirm and save/);
assert.match(copy, /Nothing is saved until/);
for (const area of ["Heart or circulation", "Diabetes or blood sugar", "Cancer care or treatment effects", "Hormones, PCOS", "arthritis", "Memory, balance", "Kidney or fluid"]) {
  assert.match(copy, new RegExp(area, "i"));
}

console.log("Guided menstrual, bladder, bowel, chronic-condition, treatment, and older-adult history checks passed.");
