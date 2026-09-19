import type { AssistantTurn, Category, DraftEvent, TrendHint } from "@/lib/schema";

/*
  The deterministic assistant.

  This runs whenever the language model is unavailable: no key, no network,
  rate limited, timed out, or it returned something that failed validation.
  It is not a degraded placeholder — it is expected to carry a live demo, so it
  handles the realistic phrasings of the scenarios HealthThread is built for.

  It obeys the same rules as the model. In particular it will NOT turn "it
  hurts a lot" into a 7. Vague intensity words are not numbers, and guessing
  one would be inventing a measurement the patient never gave.
*/

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/*
  Left/right variants are listed before their generic counterpart (first
  match wins) so "left shoulder" resolves to "Left shoulder", not the
  side-less "Shoulder" a bare "shoulder" still maps to. These exact strings
  are also what components/body/Body3D.tsx's region picker emits — the two
  input paths (text and the 3D picker) share one vocabulary.
*/
const BODY_PARTS: { match: RegExp; location: string }[] = [
  { match: /\b(?:left lower (?:stomach|abdomen|belly)|lower left abdomen|parte baja izquierda del abdomen)\b/i, location: "Left lower abdomen" },
  { match: /\b(?:right lower (?:stomach|abdomen|belly)|lower right abdomen|parte baja derecha del abdomen)\b/i, location: "Right lower abdomen" },
  { match: /\b(?:left upper (?:stomach|abdomen|belly)|upper left abdomen|parte alta izquierda del abdomen)\b/i, location: "Left upper abdomen" },
  { match: /\b(?:right upper (?:stomach|abdomen|belly)|upper right abdomen|parte alta derecha del abdomen)\b/i, location: "Right upper abdomen" },
  { match: /\b(?:lower (?:stomach|abdomen|belly|tummy)|lower abdominal)\b/i, location: "Lower abdomen" },
  { match: /\b(?:upper (?:stomach|abdomen|belly))\b/i, location: "Upper abdomen" },
  { match: /\b(?:stomach|abdomen|abdominal|belly|tummy|gut)\b/i, location: "Abdomen" },
  { match: /\b(?:vientre|barriga|est[oó]mago|abdomen)\b/i, location: "Abdomen" },
  { match: /\b(?:left lower back|lower left back|espalda baja izquierda)\b/i, location: "Left lower back" },
  { match: /\b(?:right lower back|lower right back|espalda baja derecha)\b/i, location: "Right lower back" },
  { match: /\b(?:left upper back|upper left back|espalda alta izquierda)\b/i, location: "Left upper back" },
  { match: /\b(?:right upper back|upper right back|espalda alta derecha)\b/i, location: "Right upper back" },
  { match: /\b(?:lower back|lumbar)\b/i, location: "Lower back" },
  { match: /\b(?:upper back)\b/i, location: "Back" },
  { match: /\b(?:back|espalda)\b/i, location: "Back" },
  { match: /\b(?:left ear|left earlobe|o[ií]do izquierdo|oreja izquierda)\b/i, location: "Left ear" },
  { match: /\b(?:right ear|right earlobe|o[ií]do derecho|oreja derecha)\b/i, location: "Right ear" },
  { match: /\b(?:left (?:side of (?:my )?)?face|lado izquierdo de (?:mi )?cara|cara izquierda)\b/i, location: "Left face" },
  { match: /\b(?:right (?:side of (?:my )?)?face|lado derecho de (?:mi )?cara|cara derecha)\b/i, location: "Right face" },
  { match: /\b(?:center|middle) of (?:my |the )?face\b|\bcentro de (?:mi |la )?cara\b/i, location: "Center face" },
  { match: /\b(?:left armpit|left underarm|axila izquierda)\b/i, location: "Left armpit" },
  { match: /\b(?:right armpit|right underarm|axila derecha)\b/i, location: "Right armpit" },
  { match: /\b(?:face|facial|cara|rostro)\b/i, location: "Face" },
  { match: /\b(?:ear|ears|earlobe|o[ií]do|oreja)\b/i, location: "Ear" },
  { match: /\b(?:armpit|underarm|axila)\b/i, location: "Armpit" },
  { match: /\b(?:head|forehead|temple|cabeza|frente|sien)\b/i, location: "Head" },
  { match: /\b(?:left chest|left side of (?:my )?chest|lado izquierdo del pecho|pecho izquierdo)\b/i, location: "Left chest" },
  { match: /\b(?:right chest|right side of (?:my )?chest|lado derecho del pecho|pecho derecho)\b/i, location: "Right chest" },
  { match: /\b(?:chest|pecho)\b/i, location: "Chest" },
  { match: /\b(?:neck|cuello)\b/i, location: "Neck" },
  { match: /\b(?:left shoulder|hombro izquierdo)\b/i, location: "Left shoulder" },
  { match: /\b(?:right shoulder|hombro derecho)\b/i, location: "Right shoulder" },
  { match: /\b(?:shoulder|hombro)\b/i, location: "Shoulder" },
  { match: /\b(?:left upper arm|parte superior del brazo izquierdo)\b/i, location: "Left upper arm" },
  { match: /\b(?:right upper arm|parte superior del brazo derecho)\b/i, location: "Right upper arm" },
  { match: /\b(?:left elbow|codo izquierdo)\b/i, location: "Left elbow" },
  { match: /\b(?:right elbow|codo derecho)\b/i, location: "Right elbow" },
  { match: /\b(?:left forearm|antebrazo izquierdo)\b/i, location: "Left forearm" },
  { match: /\b(?:right forearm|antebrazo derecho)\b/i, location: "Right forearm" },
  { match: /\b(?:left arm|brazo izquierdo)\b/i, location: "Left arm" },
  { match: /\b(?:right arm|brazo derecho)\b/i, location: "Right arm" },
  { match: /\b(?:arm|brazo)\b/i, location: "Arm" },
  { match: /\b(?:left hand|left wrist|mano izquierda)\b/i, location: "Left hand" },
  { match: /\b(?:right hand|right wrist|mano derecha)\b/i, location: "Right hand" },
  { match: /\b(?:hand|wrist|mano)\b/i, location: "Hand" },
  { match: /\b(?:left (?:hip|pelvis|pelvic area)|cadera izquierda|pelvis izquierda)\b/i, location: "Left pelvis" },
  { match: /\b(?:right (?:hip|pelvis|pelvic area)|cadera derecha|pelvis derecha)\b/i, location: "Right pelvis" },
  { match: /\b(?:hip|pelvis|pelvic|cadera)\b/i, location: "Pelvis" },
  { match: /\b(?:left thigh|muslo izquierdo)\b/i, location: "Left thigh" },
  { match: /\b(?:right thigh|muslo derecho)\b/i, location: "Right thigh" },
  { match: /\b(?:left lower leg|lower left leg|parte inferior de la pierna izquierda)\b/i, location: "Left lower leg" },
  { match: /\b(?:right lower leg|lower right leg|parte inferior de la pierna derecha)\b/i, location: "Right lower leg" },
  { match: /\b(?:left leg|pierna izquierda)\b/i, location: "Left leg" },
  { match: /\b(?:right leg|pierna derecha)\b/i, location: "Right leg" },
  { match: /\b(?:leg|thigh|pierna)\b/i, location: "Leg" },
  { match: /\b(?:left knee|rodilla izquierda)\b/i, location: "Left knee" },
  { match: /\b(?:right knee|rodilla derecha)\b/i, location: "Right knee" },
  { match: /\b(?:knee|rodilla)\b/i, location: "Knee" },
  { match: /\b(?:left foot|left ankle|pie izquierdo)\b/i, location: "Left foot" },
  { match: /\b(?:right foot|right ankle|pie derecho)\b/i, location: "Right foot" },
  { match: /\b(?:foot|feet|ankle|pie)\b/i, location: "Foot" },
  { match: /\b(?:throat|garganta)\b/i, location: "Throat" },
  { match: /\b(?:eye|ojo)\b/i, location: "Eye" },
  { match: /\b(?:tooth|teeth|diente|muela)\b/i, location: "Tooth" },
];

type SymptomRule = {
  match: RegExp;
  category: Category;
  label: string;
  /** Some symptoms carry their own location, e.g. a headache. */
  location?: string;
};

const SYMPTOMS: SymptomRule[] = [
  { match: /\b(?:headache|headaches|migraine|migra[ñn]a|dolor de cabeza)\b/i, category: "pain", label: "Headache", location: "Head" },
  { match: /\b(?:cramp|cramps|cramping|c[oó]licos|calambres)\b/i, category: "pain", label: "Cramps" },
  { match: /\b(?:hurt|hurts|hurting|hurted|pain|painful|ache|aches|aching|sore|stabbing|throbbing)\b/i, category: "pain", label: "Pain" },
  { match: /\b(?:me duele|duele|dolor|adolorid[oa])\b/i, category: "pain", label: "Pain" },
  { match: /\b(?:tired|exhausted|fatigue|fatigued|worn out|no energy|drained|wiped out)\b/i, category: "fatigue", label: "Fatigue" },
  { match: /\b(?:cansad[oa]|agotad[oa]|fatiga|sin energ[ií]a)\b/i, category: "fatigue", label: "Fatigue" },
  { match: /\b(?:nausea|nauseous|nauseated|queasy|sick to my stomach|throwing up|threw up|vomit|vomiting|n[aá]usea|v[oó]mito)\b/i, category: "illness", label: "Nausea" },
  { match: /\b(?:fever|feverish|temperature|chills|fiebre|escalofr[ií]os)\b/i, category: "illness", label: "Fever" },
  { match: /\b(?:dizzy|dizziness|lightheaded|mareo|maread[oa])\b/i, category: "illness", label: "Dizziness" },
  { match: /\b(?:feel sick|feeling sick|unwell|me siento mal)\b/i, category: "illness", label: "Feeling unwell" },
  { match: /\b(?:couldn'?t sleep|can'?t sleep|didn'?t sleep|insomnia|slept badly|bad sleep|poor sleep|kept waking|woke up a lot|no pude dormir|insomnio)\b/i, category: "sleep", label: "Poor sleep" },
  { match: /\b(?:slept|sleep|sleeping|dorm[ií]|sue[ñn]o)\b/i, category: "sleep", label: "Sleep" },
  { match: /\b(?:took|taking|take)\b.*\b(?:pill|tablet|medicine|medication|ibuprofen|tylenol|advil|paracetamol|acetaminophen|birth control|painkiller)\b/i, category: "medication", label: "Medication" },
  { match: /\b(?:medicine|medication|pastilla|medicamento)\b/i, category: "medication", label: "Medication" },
  { match: /\b(?:period|menstrual|bleeding|spotting|regla|per[ií]odo|menstruaci[oó]n)\b/i, category: "cycle", label: "Cycle" },
  { match: /\b(?:appetite|not hungry|no appetite|didn'?t eat|couldn'?t eat|skipped (?:lunch|dinner|breakfast)|apetito|sin hambre)\b/i, category: "food", label: "Reduced appetite" },
  { match: /\b(?:anxious|anxiety|sad|depressed|down|stressed|irritable|low mood|ansiedad|triste|estresad[oa])\b/i, category: "mood", label: "Mood" },
];

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

/*
  Only explicit intensity words map to a number. "A lot", "really bad" and
  "mucho" are deliberately absent: they are not measurements, so the assistant
  asks instead of inventing one.
*/
const INTENSITY_WORDS: { match: RegExp; value: number }[] = [
  { match: /\b(?:mild|slight|a little bit of|minor|leve)\b/i, value: 3 },
  { match: /\b(?:moderate|medium|moderad[oa])\b/i, value: 5 },
  { match: /\b(?:severe|intense|unbearable|excruciating|sever[oa]|insoportable)\b/i, value: 8 },
];

/*
  No trailing \b: JavaScript's \b is ASCII-only, so a pattern ending in an
  accented letter such as "aquí" would never match.
*/
const SPANISH_MARKERS =
  /\b(?:me duele|duele|dolor|mucho|muy|hoy|ayer|ma[ñn]ana|noche|cansad[oa]|siento|tengo|d[ií]as|desde|hace|aqu[ií]|est[oó]mago|cabeza|no puedo)/i;

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

export function detectLanguage(text: string): string {
  const spanishHits = text.match(new RegExp(SPANISH_MARKERS, "gi"))?.length ?? 0;
  return spanishHits >= 2 ? "es" : "en";
}

function extractLocation(text: string): string | null {
  for (const part of BODY_PARTS) {
    if (part.match.test(text)) return part.location;
  }
  return null;
}

/**
 * Pulls a 0-10 severity out of free text, refusing the many things that look
 * like a severity but are not: clock times, day counts, doses, durations.
 */
export function extractSeverity(text: string): number | null {
  // "7/10", "7 out of 10"
  const outOf = text.match(/\b(10|\d)\s*(?:\/|\s*out of\s*)\s*10\b/i);
  if (outOf) return Number(outOf[1]);

  // An explicit severity cue: "pain is a 7", "severity 7", "rate it 8"
  const cued = text.match(
    /\b(?:severity|pain(?:\s+is|\s+level)?|rate(?:\s+it)?|level|about|around|maybe|like|it'?s|its)\s*(?:a|an)?\s*(10|\d|zero|one|two|three|four|five|six|seven|eight|nine|ten|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b(?!\s*(?:a\.?m|p\.?m|o'?clock|hour|hours|hrs|day|days|week|weeks|month|months|year|years|minute|minutes|mg|ml|times|d[ií]as?|horas?))/i,
  );
  if (cued) {
    const raw = cued[1].toLowerCase();
    const n = raw in WORD_NUMBERS ? WORD_NUMBERS[raw] : Number(raw);
    if (n >= 0 && n <= 10) return n;
  }

  // A bare number as the entire reply — this is someone answering the question
  // we just asked, e.g. "7" or "about seven".
  const bare = text
    .trim()
    .replace(/[.!?]+$/, "")
    .match(
      /^(?:about|around|maybe|like|a|an|roughly|un|unos)?\s*(10|\d|zero|one|two|three|four|five|six|seven|eight|nine|ten|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i,
    );
  if (bare) {
    const raw = bare[1].toLowerCase();
    const n = raw in WORD_NUMBERS ? WORD_NUMBERS[raw] : Number(raw);
    if (n >= 0 && n <= 10) return n;
  }

  for (const w of INTENSITY_WORDS) {
    if (w.match.test(text)) return w.value;
  }
  return null;
}

export function extractOnset(text: string): string | null {
  const patterns: { re: RegExp; render: (m: RegExpMatchArray) => string }[] = [
    {
      re: /\b(?:for|since|over)\s+(?:the\s+)?(?:last|past)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\b/i,
      render: (m) => `for the last ${m[1]} ${m[2]}`,
    },
    {
      re: /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\s+ago\b/i,
      render: (m) => `${m[1]} ${m[2]} ago`,
    },
    {
      re: /\bhace\s+(\d+|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(d[ií]as?|semanas?|meses?)\b/i,
      render: (m) => `${m[1]} ${m[2]} ago`,
    },
    { re: /\b(?:since|from)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, render: (m) => `since ${m[1]}` },
    { re: /\b(?:since|from)\s+(?:last|this)\s+(week|month|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, render: (m) => `since last ${m[1]}` },
    { re: /\blast night\b|\banoche\b/i, render: () => "last night" },
    { re: /\bthis morning\b|\besta ma[ñn]ana\b/i, render: () => "this morning" },
    { re: /\bthis afternoon\b|\besta tarde\b/i, render: () => "this afternoon" },
    { re: /\bthis evening\b|\btonight\b|\besta noche\b/i, render: () => "this evening" },
    { re: /\byesterday\b|\bayer\b/i, render: () => "yesterday" },
    { re: /\b(?:today|right now|just now)\b|\bhoy\b|\bahora\b/i, render: () => "today" },
    { re: /\bthis week\b|\besta semana\b/i, render: () => "this week" },
    { re: /\ball day\b|\btodo el d[ií]a\b/i, render: () => "all day" },
  ];

  for (const p of patterns) {
    const m = text.match(p.re);
    if (m) return p.render(m);
  }
  return null;
}

export function extractPattern(text: string): string | null {
  const around = text.match(/\b(?:around|about|at)\s+(\d{1,2})\s*(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (around) return `Around ${around[1]} ${around[2].replace(/\./g, "").toUpperCase()}`;

  const daypart = text.match(
    /\b(?:every |each |in the )(morning|afternoon|evening|night|mornings|afternoons|evenings|nights)\b/i,
  );
  if (daypart) {
    const word = daypart[1].replace(/s$/, "");
    return `In the ${word}`;
  }

  if (/\bafter (?:dinner|lunch|breakfast|eating|meals?)\b/i.test(text)) {
    const m = text.match(/\bafter (dinner|lunch|breakfast|eating|meals?)\b/i);
    return `After ${m![1].toLowerCase()}`;
  }
  if (/\bat night\b|\bde noche\b/i.test(text)) return "At night";
  return null;
}

export function extractTrendHint(text: string): TrendHint | null {
  if (/\b(?:worse|worsening|getting worse|more than|increasing|increased|peor|empeorando)\b/i.test(text))
    return "worse";
  if (/\b(?:better|improving|improved|less than|easing|mejor|mejorando)\b/i.test(text)) return "better";
  if (/\b(?:same|unchanged|no change|igual)\b/i.test(text)) return "same";
  return null;
}

export function extractDurationMinutes(text: string): number | null {
  const hoursAndMins = text.match(/\b(\d{1,2})\s*h(?:ours?|rs?)?\s*(?:and\s*)?(\d{1,2})\s*m/i);
  if (hoursAndMins) return Number(hoursAndMins[1]) * 60 + Number(hoursAndMins[2]);

  const hours = text.match(
    /\b(\d{1,2}(?:\.\d)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:hours?|hrs?|h)\b/i,
  );
  if (hours) {
    const raw = hours[1].toLowerCase();
    const n = raw in WORD_NUMBERS ? WORD_NUMBERS[raw] : Number(raw);
    if (n > 0 && n <= 24) return Math.round(n * 60);
  }

  const mins = text.match(/\b(\d{1,3})\s*(?:minutes?|mins?)\b/i);
  if (mins) return Number(mins[1]);
  return null;
}

// ---------------------------------------------------------------------------
// Turning text into drafts
// ---------------------------------------------------------------------------

function labelFor(rule: SymptomRule, location: string | null): string {
  if (rule.label !== "Pain") return rule.label;
  switch (location) {
    case "Lower abdomen":
    case "Upper abdomen":
    case "Abdomen":
      return "Abdominal pain";
    case "Head":
      return "Headache";
    case null:
    case undefined:
      return "Pain";
    default:
      return `${location} pain`;
  }
}

/** Splits "I'm tired and I have headaches" so each symptom gets its own event. */
function segments(text: string): string[] {
  const parts = text
    .split(/\b(?:and also|and|but also|plus|;|,\s*(?:also|and))\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return parts.length ? parts : [text];
}

export function extractDrafts(text: string): DraftEvent[] {
  const found: DraftEvent[] = [];
  const usedRules = new Set<string>();

  for (const segment of segments(text)) {
    for (const rule of SYMPTOMS) {
      if (!rule.match.test(segment)) continue;
      if (usedRules.has(rule.label)) continue;

      const location = rule.location ?? extractLocation(segment) ?? extractLocation(text);
      const draft: DraftEvent = {
        category: rule.category,
        label: labelFor(rule, location),
        severity: extractSeverity(segment) ?? null,
        bodyLocation: rule.category === "pain" ? location : null,
        onset: extractOnset(segment) ?? extractOnset(text),
        pattern: extractPattern(segment),
        trendHint: extractTrendHint(segment),
        durationMinutes:
          rule.category === "sleep" ? extractDurationMinutes(segment) : null,
        originalInput: segment.trim(),
        inputLanguage: detectLanguage(text),
        translation: null,
        note: null,
        cycleDay: null,
        cyclePhase: null,
      };

      usedRules.add(rule.label);
      found.push(draft);
      break; // one symptom per segment; the most specific rule wins
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Which details are still missing, and what to ask for
// ---------------------------------------------------------------------------

/*
  What counts as "enough to record".

  Pain is the signal clinicians lean on most, so it needs all three: where,
  how strong, since when. Location is asked first because it is the easiest
  thing to answer and there is a body map right there.

  Everything else needs only ONE meaningful detail. Someone who says "I get
  tired around 3 PM" has already told us something useful; interrogating them
  for a 0-10 number they did not volunteer is exactly the friction HealthThread
  exists to remove.
*/
const REQUIRED_ALL: Partial<Record<Category, (keyof DraftEvent)[]>> = {
  pain: ["bodyLocation", "severity", "onset"],
};

const REQUIRED_ANY: Partial<Record<Category, (keyof DraftEvent)[]>> = {
  fatigue: ["severity", "onset", "pattern"],
  illness: ["severity", "onset", "pattern"],
  sleep: ["durationMinutes", "severity"],
};

function isBlank(v: unknown) {
  return v === null || v === undefined || v === "";
}

export function missingFieldsFor(draft: DraftEvent): string[] {
  const all = REQUIRED_ALL[draft.category] ?? [];
  const missingAll = all.filter((f) => isBlank(draft[f])) as string[];
  if (missingAll.length) return missingAll;

  const any = REQUIRED_ANY[draft.category] ?? [];
  if (any.length && any.every((f) => isBlank(draft[f]))) {
    // Ask for the first option; any of them satisfies the requirement.
    return [any[0] as string];
  }
  return [];
}

/*
  Structured fields stay in English so the record is consistent, but a question
  put to the patient must be entirely in their language — an English label
  spliced into a Spanish sentence reads as broken software.
*/
const CATEGORY_NOUN_ES: Partial<Record<Category, string>> = {
  pain: "el dolor",
  fatigue: "el cansancio",
  illness: "el malestar",
  sleep: "el sueño",
  mood: "el ánimo",
};

const QUESTIONS: Record<string, Record<string, (d: DraftEvent) => string>> = {
  en: {
    severity: (d) =>
      `How strong is the ${d.label.toLowerCase()}? You can give me a number from 0 to 10, or say mild, moderate, or severe.`,
    bodyLocation: () => "Where do you feel it? You can tell me, or tap the body picture.",
    onset: (d) => `When did the ${d.label.toLowerCase()} start?`,
    pattern: (d) => `When do you usually notice the ${d.label.toLowerCase()}?`,
    durationMinutes: () => "About how long did you sleep?",
  },
  es: {
    severity: (d) =>
      `¿Qué tan fuerte es ${CATEGORY_NOUN_ES[d.category] ?? "esto"}? Puede darme un número del 0 al 10, o decir leve, moderado o severo.`,
    bodyLocation: () => "¿Dónde lo siente? Puede decírmelo o tocar la imagen del cuerpo.",
    onset: () => "¿Cuándo comenzó?",
    pattern: () => "¿En qué momento del día lo nota normalmente?",
    durationMinutes: () => "¿Aproximadamente cuánto durmió?",
  },
};

const ACKS: Record<string, (drafts: DraftEvent[]) => string> = {
  en: (drafts) => {
    const labels = drafts.map((d) => d.label.toLowerCase());
    return labels.length === 1
      ? `Thank you for telling me about the ${labels[0]}.`
      : `Thank you. I heard about ${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}.`;
  },
  es: (drafts) => {
    const nouns = drafts.map((d) => CATEGORY_NOUN_ES[d.category] ?? "esto");
    return nouns.length === 1
      ? `Gracias por contarme sobre ${nouns[0]}.`
      : `Gracias. Escuché sobre ${nouns.slice(0, -1).join(", ")} y ${nouns.at(-1)}.`;
  },
};

const NOTHING_UNDERSTOOD: Record<string, string> = {
  en: "I want to record this correctly. Can you tell me what you are feeling, and where in your body you feel it?",
  es: "Quiero registrar esto correctamente. ¿Puede decirme qué siente y en qué parte del cuerpo lo siente?",
};

function question(lang: string, field: string, draft: DraftEvent): string {
  const set = QUESTIONS[lang] ?? QUESTIONS.en;
  return (set[field] ?? QUESTIONS.en[field] ?? QUESTIONS.en.severity)(draft);
}

/**
 * The full deterministic turn.
 *
 * Every user message in the conversation is re-parsed each turn and merged, so
 * details arrive in any order and answers to earlier questions are never lost.
 */
export function fallbackTurn(messages: { role: string; content: string }[]): AssistantTurn {
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);
  const joined = userTurns.join(" \n ");
  const lang = detectLanguage(joined);

  let drafts: DraftEvent[] = [];

  for (const turn of userTurns) {
    const newDrafts = extractDrafts(turn);

    if (newDrafts.length && drafts.length === 0) {
      drafts = newDrafts;
      continue;
    }

    for (const nd of newDrafts) {
      const existing = drafts.find((d) => d.label === nd.label);
      if (existing) {
        // Fill only what is still blank, so the patient's first description wins.
        existing.severity ??= nd.severity;
        existing.bodyLocation ??= nd.bodyLocation;
        existing.onset ??= nd.onset;
        existing.pattern ??= nd.pattern;
        existing.trendHint ??= nd.trendHint;
        existing.durationMinutes ??= nd.durationMinutes;
      } else {
        drafts.push(nd);
      }
    }

    /*
      A short reply with no recognisable symptom is an answer to the question we
      just asked. Apply it to the first draft still waiting on that detail.
    */
    if (!newDrafts.length && drafts.length) {
      const severity = extractSeverity(turn);
      const onset = extractOnset(turn);
      const location = extractLocation(turn);
      const duration = extractDurationMinutes(turn);
      const pattern = extractPattern(turn);

      /*
        Route the answer to the event the question was actually about: the
        first one still MISSING that detail, not merely the first one where it
        happens to be blank. Someone who said "tired around 3 PM and also
        headaches" was asked about the headache, so the 7 belongs there.
      */
      const needing = (field: string) =>
        drafts.find((d) => missingFieldsFor(d).includes(field)) ??
        drafts.find((d) => isBlank(d[field as keyof DraftEvent]));

      if (severity !== null) {
        const target = needing("severity");
        if (target) target.severity = severity;
      }
      if (onset) {
        const target = needing("onset");
        if (target) target.onset = onset;
      }
      if (location) {
        const target =
          drafts.find((d) => d.category === "pain" && missingFieldsFor(d).includes("bodyLocation")) ??
          drafts.find((d) => d.category === "pain" && !d.bodyLocation);
        if (target) target.bodyLocation = location;
      }
      if (duration !== null) {
        const target = drafts.find(
          (d) => d.category === "sleep" && !d.durationMinutes,
        );
        if (target) target.durationMinutes = duration;
      }
      if (pattern) {
        const target = drafts.find((d) => !d.pattern);
        if (target) target.pattern = pattern;
      }
    }
  }

  if (!drafts.length) {
    return {
      action: "ask",
      reply: "",
      question: NOTHING_UNDERSTOOD[lang] ?? NOTHING_UNDERSTOOD.en,
      drafts: [],
      missingFields: [],
      detectedLanguage: lang,
      source: "fallback",
    };
  }

  const ack = (ACKS[lang] ?? ACKS.en)(drafts);

  // One question at a time, always about the first gap in the first event.
  for (const draft of drafts) {
    const missing = missingFieldsFor(draft);
    if (missing.length) {
      return {
        action: "ask",
        reply: ack,
        question: question(lang, missing[0], draft),
        drafts,
        missingFields: missing,
        detectedLanguage: lang,
        source: "fallback",
      };
    }
  }

  return {
    action: "propose",
    reply: ack,
    question: null,
    drafts,
    missingFields: [],
    detectedLanguage: lang,
    source: "fallback",
  };
}
