/*
  The deterministic assistant has to carry the live demo when there is no API
  key, so it gets tested like the load-bearing component it is.

  Run with: npx tsx scripts/verify-fallback.ts
*/
import { fallbackTurn, extractDrafts, extractSeverity, extractOnset } from "../lib/ai/fallback";

let failures = 0;

function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail && !ok ? `  <- ${detail}` : ""}`);
  if (!ok) failures++;
}

const user = (content: string) => ({ role: "user" as const, content });
const bot = (content: string) => ({ role: "assistant" as const, content });

console.log("\n--- The demo conversation ---");
{
  const t1 = fallbackTurn([user("My lower stomach has been hurting a lot today.")]);
  console.log(`  patient: "My lower stomach has been hurting a lot today."`);
  console.log(`  assistant: ${t1.question}`);
  check(t1.action === "ask", "asks instead of proposing");
  check(
    t1.drafts[0]?.label === "Abdominal pain",
    "labels it abdominal pain",
    t1.drafts[0]?.label,
  );
  check(t1.drafts[0]?.bodyLocation === "Lower abdomen", "locates it in the lower abdomen");
  check(t1.drafts[0]?.onset === "today", "captures onset from 'today'");
  check(
    t1.drafts[0]?.severity === null,
    "does NOT invent a severity from 'a lot'",
    String(t1.drafts[0]?.severity),
  );
  check(/how strong/i.test(t1.question ?? ""), "asks about severity first");

  const t2 = fallbackTurn([
    user("My lower stomach has been hurting a lot today."),
    bot(t1.question!),
    user("About seven."),
  ]);
  console.log(`  patient: "About seven."`);
  check(t2.action === "propose", "proposes once severity is known", t2.question ?? "");
  check(t2.drafts[0]?.severity === 7, "reads seven from 'About seven.'");
  check(t2.drafts[0]?.bodyLocation === "Lower abdomen", "keeps the earlier location");
  check(t2.drafts[0]?.onset === "today", "keeps the earlier onset");
}

console.log("\n--- The 'I don't know where this goes' case ---");
{
  const text =
    "I don't know where this goes but I've been getting really tired around 3 PM and I've had headaches.";
  const t = fallbackTurn([user(text)]);
  const labels = t.drafts.map((d) => d.label).sort();
  console.log(`  understood: ${labels.join(", ")}`);
  check(t.drafts.length === 2, `splits into two events`, String(t.drafts.length));
  check(labels.includes("Fatigue") && labels.includes("Headache"), "fatigue and headache");
  const fatigue = t.drafts.find((d) => d.label === "Fatigue");
  check(fatigue?.pattern === "Around 3 PM", "captures the 3 PM pattern", String(fatigue?.pattern));
  check(t.action === "ask", "still asks for what is missing");

  console.log(`  assistant: ${t.question}`);
  check(/headache/i.test(t.question ?? ""), "asks about the headache, not the fatigue");

  const t2 = fallbackTurn([
    user(text),
    bot(t.question!),
    user("7"),
    bot("When did they start?"),
    user("three days ago"),
  ]);
  const headache = t2.drafts.find((d) => d.label === "Headache");
  const fatigue2 = t2.drafts.find((d) => d.label === "Fatigue");
  check(t2.action === "propose", "proposes after both answers", t2.question ?? "");
  check(headache?.severity === 7, "the 7 lands on the headache", String(headache?.severity));
  check(headache?.onset === "three days ago", "onset lands on the headache");
  check(
    fatigue2?.severity === null && fatigue2?.pattern === "Around 3 PM",
    "fatigue is kept as a pattern without inventing a severity",
  );
}

console.log("\n--- Spanish ---");
{
  const t = fallbackTurn([user("Me duele mucho aqu\u00ed, desde ayer.")]);
  console.log(`  assistant: ${t.question}`);
  check(t.detectedLanguage === "es", "detects Spanish", t.detectedLanguage);
  check(/D[oó]nde|Qu[eé] tan/i.test(t.question ?? ""), "asks in Spanish");
  check(t.drafts[0]?.category === "pain", "recognises pain");
  check(t.drafts[0]?.onset === "yesterday", "reads 'desde ayer'", String(t.drafts[0]?.onset));
  check(t.drafts[0]?.severity === null, "does not read 'mucho' as a number");
}

console.log("\n--- Patient-relative pelvis sides ---");
{
  const right = extractDrafts("My right pelvis hurts.")[0];
  const left = extractDrafts("Me duele la pelvis izquierda.")[0];
  check(right?.bodyLocation === "Right pelvis", "keeps right pelvis precise", String(right?.bodyLocation));
  check(right?.label === "Right pelvis pain", "labels right pelvis pain precisely", String(right?.label));
  check(left?.bodyLocation === "Left pelvis", "recognises left pelvis in Spanish", String(left?.bodyLocation));
}

console.log("\n--- Clinician-precise body regions ---");
{
  const cases: [string, string][] = [
    ["My right chest hurts.", "Right chest"],
    ["Pain in my left upper arm.", "Left upper arm"],
    ["My right forearm hurts.", "Right forearm"],
    ["Pain in my right thigh.", "Right thigh"],
    ["My left lower leg hurts.", "Left lower leg"],
    ["Me duele el muslo derecho.", "Right thigh"],
  ];
  for (const [text, expected] of cases) {
    const location = extractDrafts(text)[0]?.bodyLocation;
    check(location === expected, `"${text}" -> ${expected}`, String(location));
  }
}

console.log("\n--- Things that look like a severity but are not ---");
{
  const cases: [string, number | null][] = [
    ["It started around 3 PM", null],
    ["It began three days ago", null],
    ["I took 400 mg of ibuprofen", null],
    ["I slept about five hours", null],
    ["The pain is a 7", 7],
    ["7/10", 7],
    ["about seven", 7],
    ["8 out of 10", 8],
    ["It's mild", 3],
    ["severe", 8],
    ["it hurts a lot", null],
    ["really bad", null],
  ];
  for (const [text, expected] of cases) {
    const got = extractSeverity(text);
    check(got === expected, `"${text}" -> ${expected}`, `got ${got}`);
  }
}

console.log("\n--- Onset phrasings ---");
{
  const cases: [string, string | null][] = [
    ["it started three days ago", "three days ago"],
    ["since Monday", "since Monday"],
    ["last night", "last night"],
    ["for the last two weeks", "for the last two weeks"],
    ["this morning", "this morning"],
    ["hace tres d\u00edas", "tres d\u00edas ago"],
  ];
  for (const [text, expected] of cases) {
    const got = extractOnset(text);
    check(got === expected, `"${text}" -> ${expected}`, `got ${got}`);
  }
}

console.log("\n--- Unintelligible input ---");
{
  const t = fallbackTurn([user("hmm")]);
  check(t.action === "ask", "asks rather than inventing an event");
  check(t.drafts.length === 0, "proposes nothing");
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
