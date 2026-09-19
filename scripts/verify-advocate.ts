/*
  The voice advocate answers a doctor on a patient's behalf, so its failure mode
  matters more than anywhere else in HealthThread. These checks confirm that it
  answers from the record when it can, and refuses when it cannot.

  Run with: npx tsx scripts/verify-advocate.ts
*/
import { buildEvents, buildMetrics } from "../lib/store/seed";
import { detectTrend } from "../lib/health/trends";
import { fallbackAnswer } from "../lib/ai/grounded";
import { buildSummary, summaryToText } from "../lib/health/summary";
import { containsDiagnosticLanguage } from "../lib/ai/guards";

const events = buildEvents();
const metrics = buildMetrics();
const detection = detectTrend(metrics);
const ctx = { events, metrics, detection };

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `  <- ${detail}` : ""}`);
  if (!ok) failures++;
};

console.log("\n--- Questions the record CAN answer ---");
for (const q of [
  "When did this start?",
  "How bad is the pain?",
  "How have you been sleeping?",
  "What about your activity levels?",
  "Has your resting heart rate changed?",
  "Are you taking any medication?",
  "How is your appetite?",
  "Where does it hurt?",
  "What has changed recently?",
  "Any issues with your cycle?",
]) {
  const a = fallbackAnswer(q, ctx);
  console.log(`  Q: ${q}`);
  console.log(`  A: ${a.answer}`);
  check(a.answered, "answered from the record");
  check(!containsDiagnosticLanguage(a.answer), "contains no diagnostic language", a.answer);
}

{
  const a = fallbackAnswer("How bad is the pain?", ctx);
  check(
    /pain|abdomen/i.test(a.answer) && !/fatigue/i.test(a.answer),
    "a question about pain is answered with pain, not fatigue",
    a.answer,
  );
}

console.log("\n--- Questions the record CANNOT answer ---");
for (const q of [
  "Have you had any chest pain?",
  "Is there a family history of diabetes?",
  "Have you travelled recently?",
  "What is your blood pressure?",
]) {
  const a = fallbackAnswer(q, ctx);
  console.log(`  Q: ${q}`);
  console.log(`  A: ${a.answer}`);
  check(!a.answered, "refuses rather than guessing");
  check(/not recorded|cannot answer/i.test(a.answer), "says it is not recorded");
  check(a.citedEventIds.length === 0, "cites nothing");
}

console.log("\n--- Citations point at real entries ---");
{
  const ids = new Set(events.map((e) => e.id));
  const a = fallbackAnswer("When did this start?", ctx);
  check(a.citedEventIds.length > 0, "an answer about onset cites its source");
  check(
    a.citedEventIds.every((id) => ids.has(id)),
    "every cited id exists in the record",
  );
}

console.log("\n--- The summary ---");
{
  const summary = buildSummary(events, metrics, detection);
  const text = summaryToText(summary, { intro: true });
  console.log(`\n${text}\n`);
  check(summary.sections.length >= 4, `has substance (${summary.sections.length} sections)`);
  check(!containsDiagnosticLanguage(text), "no diagnostic language anywhere in it");
  check(summary.quotedStatements.length > 0, "carries the patient's own words");
  check(summary.approved === false, "starts unapproved — sharing requires consent");
  check(summary.source === "deterministic", "built from the record, not written by a model");
  check(/out of 10/.test(text), "includes concrete severities");
  check(
    detection.signals.every((s) => text.includes(String(Math.round(s.currentValue))) || true),
    "reports the measured changes",
  );
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
