import { ExplainBack } from "@/lib/schema";
import { completeJson } from "./provider";
import { EXPLAIN_BACK_SYSTEM } from "./prompts";

/*
  The other direction across the bridge: what the doctor just said, rewritten so
  the patient can understand it.

  The no-diagnosis guard is deliberately NOT applied here. A doctor is allowed
  to name a condition or order a test — that is their job. Our job is to keep
  every instruction, dose and number intact while replacing the jargon, and to
  keep the doctor's original wording alongside it.
*/

/** Common terms, so the offline path is still genuinely useful. */
const GLOSSARY: [RegExp, string][] = [
  [/\bultrasound\b/gi, "ultrasound (a scan that uses sound to take a picture inside you)"],
  [/\bpelvic exam\b/gi, "pelvic exam (an examination of your lower belly area)"],
  [/\bblood panel\b|\bblood work\b|\bCBC\b/gi, "blood test"],
  [/\brule out\b/gi, "check that it is not"],
  [/\bNSAIDs?\b/gi, "anti-inflammatory painkillers such as ibuprofen"],
  [/\banalgesics?\b/gi, "painkillers"],
  [/\bcontraindicated\b/gi, "not safe for you"],
  [/\bidiopathic\b/gi, "without a known cause"],
  [/\bchronic\b/gi, "long-lasting"],
  [/\bacute\b/gi, "sudden and short-lasting"],
  [/\bbenign\b/gi, "not harmful"],
  [/\brefer(?:ral)?\b/gi, "send you to a specialist"],
  [/\bfollow[- ]up\b/gi, "another appointment to check how you are"],
  // No leading article in the replacement: the sentence usually already has one.
  [/\bsymptom diary\b/gi, "daily record of how you feel"],
  [/\btwice daily\b|\bBID\b/gi, "two times a day"],
  [/\bonce daily\b|\bOD\b/gi, "one time a day"],
  [/\bPRN\b|\bas needed\b/gi, "only when you need it"],
  [/\bNPO\b|\bnil by mouth\b/gi, "nothing to eat or drink"],
  [/\bmonitor\b/gi, "keep an eye on"],
  [/\bexacerbat(?:e|ing|ion)\b/gi, "make it worse"],
];

function offlinePlainLanguage(text: string): string {
  let out = text;
  for (const [re, plain] of GLOSSARY) out = out.replace(re, plain);

  // Long sentences are the other half of the readability problem.
  return out
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

export async function explainBack(
  original: string,
  language = "en",
): Promise<ExplainBack> {
  const raw = await completeJson(
    EXPLAIN_BACK_SYSTEM,
    [
      {
        role: "user",
        content: JSON.stringify({ doctorSaid: original, patientLanguage: language }),
      },
    ],
    700,
  );

  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (typeof r.plain === "string" && r.plain.trim()) {
      return ExplainBack.parse({
        original,
        plain: r.plain,
        translated:
          typeof r.translated === "string" && r.translated.trim() ? r.translated : null,
        language,
        source: "llm",
      });
    }
  }

  return ExplainBack.parse({
    original,
    plain: offlinePlainLanguage(original),
    translated: null,
    language,
    source: "fallback",
  });
}
