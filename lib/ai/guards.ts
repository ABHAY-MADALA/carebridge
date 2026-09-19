/*
  Last line of defence on model output.

  The system prompts forbid diagnosis, but a prompt is a request, not a
  guarantee. Anything a model writes for the PATIENT to read — observations and
  summaries — passes through here first, and if it trips, we ship the
  deterministic text instead.

  Deliberately NOT applied to /api/explain-back: there the model is relaying
  what a doctor actually said, and a doctor is allowed to name a condition.
*/

const DIAGNOSTIC_PATTERNS: RegExp[] = [
  /\byou (?:have|may have|might have|could have|likely have)\b/i,
  /\b(?:this|that|it) (?:is|means|suggests|indicates|points to|could be|may be|might be)\s+(?:an?\s+)?(?:sign|symptom|indication)\b/i,
  /\bconsistent with\b/i,
  /\bdiagnos(?:is|e|ed|tic)\b/i,
  /\bcaused by\b/i,
  /\bdue to (?:an?|your)\b/i,
  /\bprobably\b/i,
  /\b(?:infection|inflammation|disease|disorder|syndrome|cancer|tumou?r|cyst|appendicitis|endometriosis|anemia|anaemia)\b/i,
  /\bPMOS is (?:worsening|progressing|getting worse)\b/i,
  /\byou should (?:take|stop|start|see|visit|go)\b/i,
  /\bI recommend\b/i,
  /\b(?:urgent|urgently|emergency|serious|severe condition|dangerous|life-threatening|alarming)\b/i,
];

/*
  HealthThread's own disclaimers talk ABOUT diagnosis in order to disclaim it, so
  a naive scan flags our own safety text. These phrasings are stripped before
  scanning. Kept as an explicit short list rather than clever negative
  lookbehinds, because the next person to touch this needs to be able to see
  exactly what is exempt.
*/
const SAFE_DISCLAIMERS: RegExp[] = [
  /\b(?:it|this|that) is not a diagnosis\b/gi,
  /\b(?:is|are) not (?:a )?diagnos(?:is|es|tic)\b/gi,
  /\bdoes not diagnose\b/gi,
  /\bcannot diagnose\b/gi,
  /\bnot a medical diagnosis\b/gi,
  /\bwithout diagnosing\b/gi,
];

function stripDisclaimers(text: string): string {
  return SAFE_DISCLAIMERS.reduce((acc, re) => acc.replace(re, ""), text);
}

export function containsDiagnosticLanguage(text: string): boolean {
  const scanned = stripDisclaimers(text);
  return DIAGNOSTIC_PATTERNS.some((re) => re.test(scanned));
}

/** Returns the offending phrase, for the server log. */
export function diagnosticReason(text: string): string | null {
  const scanned = stripDisclaimers(text);
  for (const re of DIAGNOSTIC_PATTERNS) {
    const m = scanned.match(re);
    if (m) return m[0];
  }
  return null;
}

/**
 * Checks model-written summary sections. Rejecting the whole batch (rather than
 * one section) keeps the patient from reading a summary that is half-rewritten
 * and half-original, which would be confusing and hard to trust.
 */
export function summaryIsSafe(sections: { heading: string; body: string }[]): boolean {
  return !sections.some(
    (s) => containsDiagnosticLanguage(s.body) || containsDiagnosticLanguage(s.heading),
  );
}
