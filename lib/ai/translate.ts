import { completeJson } from "./provider";
import { TRANSLATE_SYSTEM } from "./prompts";
import { detectLanguage } from "./fallback";

/*
  Translation is always ADDITIVE. The patient's original words are never
  replaced, only accompanied, because the original is the primary record and a
  translation is an interpretation of it.
*/

/*
  Offline dictionary. Small and honest: it covers the phrases a Spanish-
  speaking patient is most likely to use about pain and fatigue, which is
  enough to demonstrate the architecture without a key. It is not a general
  translator and does not pretend to be.
*/
/*
  A trailing \b does not work after an accented letter: JavaScript's \b is
  ASCII-only, so "aquí" has no word boundary after the "í" and the pattern
  silently fails to match. Accent-final patterns use a lookahead instead.
*/
const NOT_LETTER = "(?![a-zA-ZáéíóúñÁÉÍÓÚÑ])";

const PHRASES: [RegExp, string][] = [
  [new RegExp(`\\bme duele mucho aqu[ií]${NOT_LETTER}`, "gi"), "it hurts a lot here"],
  [/\bme duele mucho\b/gi, "it hurts a lot"],
  [/\bme duele\b/gi, "it hurts"],
  [/\bdolor de cabeza\b/gi, "headache"],
  [/\bdolor de est[oó]mago\b/gi, "stomach pain"],
  [/\bdolor\b/gi, "pain"],
  [/\bno puedo dormir\b/gi, "I cannot sleep"],
  [/\bestoy muy cansad[oa]\b/gi, "I am very tired"],
  [/\bestoy cansad[oa]\b/gi, "I am tired"],
  [/\bme siento mal\b/gi, "I feel unwell"],
  [/\btengo n[aá]useas?\b/gi, "I feel nauseous"],
  [/\btengo fiebre\b/gi, "I have a fever"],
  [/\bno tengo hambre\b/gi, "I am not hungry"],
  [/\bdesde ayer\b/gi, "since yesterday"],
  [/\bhace tres d[ií]as\b/gi, "three days ago"],
  [/\bhace dos d[ií]as\b/gi, "two days ago"],
  [/\besta ma[ñn]ana\b/gi, "this morning"],
  [/\besta tarde\b/gi, "this afternoon"],
  [/\bpor la noche\b/gi, "at night"],
  [/\bbajo vientre\b/gi, "lower abdomen"],
  [/\best[oó]mago\b/gi, "stomach"],
  [/\bcabeza\b/gi, "head"],
  [/\bespalda\b/gi, "back"],
  [/\bmucho\b/gi, "a lot"],
  [/\bhoy\b/gi, "today"],
  [/\bayer\b/gi, "yesterday"],
  [new RegExp(`\\baqu[ií]${NOT_LETTER}`, "gi"), "here"],
];

function offlineTranslate(text: string): string {
  let out = text;
  for (const [re, en] of PHRASES) out = out.replace(re, en);
  // Capitalise, since the phrase table works on lowercase fragments.
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export type Translation = {
  original: string;
  english: string;
  detectedLanguage: string;
  source: "llm" | "fallback";
};

export async function translateToEnglish(text: string): Promise<Translation> {
  const detected = detectLanguage(text);

  if (detected === "en") {
    return { original: text, english: text, detectedLanguage: "en", source: "fallback" };
  }

  const raw = await completeJson(TRANSLATE_SYSTEM, [{ role: "user", content: text }], 400);
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (typeof r.english === "string" && r.english.trim()) {
      return {
        original: text,
        english: r.english,
        detectedLanguage:
          typeof r.detectedLanguage === "string" ? r.detectedLanguage : detected,
        source: "llm",
      };
    }
  }

  return {
    original: text,
    english: offlineTranslate(text),
    detectedLanguage: detected,
    source: "fallback",
  };
}
