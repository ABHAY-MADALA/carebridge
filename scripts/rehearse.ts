/*
  Walks the demo script end to end against a running dev server, so a
  regression in the demo path is caught before a judge finds it.

  Start the server first, then: npx tsx scripts/rehearse.ts
*/
import { buildEvents, buildMetrics } from "../lib/store/seed";
import { detectTrend } from "../lib/health/trends";
import { buildSummary, summaryToText } from "../lib/health/summary";
import { METRICS } from "../lib/health/metrics";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `  <- ${detail}` : ""}`);
  if (!ok) failures++;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

type Turn = {
  action: string;
  question: string | null;
  drafts: { label: string; severity: number | null; bodyLocation: string | null; onset: string | null }[];
  detectedLanguage: string;
  source: string;
};

const status = await fetch(`${BASE}/api/voice-status`).then((r) => r.json());
console.log(
  `\nServer: ${BASE}   LLM: ${status.llm ? status.llmProvider : "none (fallback)"}   ElevenLabs: ${
    status.elevenlabs ? "live" : "none (browser voice)"
  }\n`,
);

// ---------------------------------------------------------------------------
console.log("0:20  Patient speaks to the assistant");
const first = "My lower stomach has been hurting a lot today.";
const t1 = await post<Turn>("/api/assistant", { messages: [{ role: "user", content: first }] });
console.log(`  patient:   "${first}"`);
console.log(`  assistant: "${t1.question}"`);
check(t1.action === "ask", "asks a follow-up rather than guessing");
check(t1.drafts[0]?.severity === null, "did not invent a severity from 'a lot'");

console.log("\n0:30  Patient answers");
const t2 = await post<Turn>("/api/assistant", {
  messages: [
    { role: "user", content: first },
    { role: "assistant", content: t1.question ?? "" },
    { role: "user", content: "About seven." },
  ],
});
console.log(`  patient: "About seven."`);
console.log(
  `  understood: ${t2.drafts[0]?.label} ${t2.drafts[0]?.severity}/10, ${t2.drafts[0]?.bodyLocation}, started ${t2.drafts[0]?.onset}`,
);
check(t2.action === "propose", "proposes for confirmation", t2.question ?? "");
check(t2.drafts[0]?.severity === 7, "severity is 7");
check(t2.drafts[0]?.bodyLocation === "Lower abdomen", "location survived the follow-up");

// ---------------------------------------------------------------------------
console.log("\n1:05  The change banner");
const metrics = buildMetrics();
const events = buildEvents();
const detection = detectTrend(metrics);
check(detection.triggered, `${detection.signals.length} signals move together`);
for (const s of detection.signals) {
  const m = METRICS[s.metric];
  console.log(`  ${m.label}: ${m.format(s.baselineValue)} -> ${m.format(s.currentValue)}`);
}

console.log("\n1:35  The cycle-aware baseline");
check(
  detection.signals.every((s) => s.baselineSource === "cycle-phase"),
  `compared against the same ${detection.phase} phase, not a flat average`,
);

// ---------------------------------------------------------------------------
console.log("\n1:55  Help Me Explain");
const base = buildSummary(events, metrics, detection);
const polished = await post<typeof base>("/api/summary", { summary: base });
check(polished.sections.length === base.sections.length, "summary survived the rewording pass");
check(
  polished.approved === false,
  "still unapproved — the patient has to agree before anything is shared",
);
console.log(`  ${polished.sections.length} sections, source: ${polished.source}`);

console.log("\n2:15  Speak for Me");
const spoken = summaryToText(polished, { intro: true });
const speech = await fetch(`${BASE}/api/speech`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text: spoken.slice(0, 200), speaker: "patient" }),
});
check(
  speech.status === 200 || speech.status === 204,
  `speech route answers usefully (${speech.status}${speech.status === 204 ? " = browser will speak" : " = ElevenLabs audio"})`,
);
console.log(`  first words: "${spoken.split("\n")[0]}"`);

// ---------------------------------------------------------------------------
console.log("\n2:30  The doctor asks out loud");
for (const q of ["When did this start?", "Have you had any chest pain?"]) {
  const a = await post<{ answered: boolean; answer: string; citedEventIds: string[] }>("/api/ask", {
    question: q,
    events,
    metrics,
    detection,
  });
  console.log(`  doctor: "${q}"`);
  console.log(`  Alex:   "${a.answer}"`);
  if (q.includes("chest")) {
    check(!a.answered, "refuses what is not in the record");
  } else {
    check(a.answered && a.citedEventIds.length > 0, "answers and cites its source");
  }
}

console.log("\n2:45  The doctor explains something back");
const back = await post<{ plain: string; original: string }>("/api/explain-back", {
  text: "I want to rule out an ovarian cyst, so we will order a pelvic ultrasound. Take NSAIDs PRN.",
  language: "en",
});
console.log(`  plain: "${back.plain}"`);
check(back.plain !== back.original, "rewrote the jargon");
check(back.original.includes("NSAIDs"), "kept the doctor's exact words alongside");

// ---------------------------------------------------------------------------
console.log("\nBonus  Spanish input");
const es = await post<Turn>("/api/assistant", {
  messages: [{ role: "user", content: "Me duele mucho aqu\u00ed, desde ayer." }],
});
console.log(`  assistant: "${es.question}"`);
check(es.detectedLanguage === "es", "detected Spanish");
check(/[¿?]/.test(es.question ?? ""), "replied in Spanish");

console.log(
  failures === 0
    ? "\nDemo path is intact.\n"
    : `\n${failures} step(s) of the demo are broken.\n`,
);
process.exit(failures === 0 ? 0 : 1);
}

void main();
