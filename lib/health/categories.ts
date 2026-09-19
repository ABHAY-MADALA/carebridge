import type { Category } from "@/lib/schema";

/*
  The plain-language names patients see. The stored value stays machine-
  readable; nobody is ever shown the word "illness" as a category heading
  without a friendlier label attached.
*/
export const CATEGORY_LABEL: Record<Category, string> = {
  pain: "Something hurts",
  illness: "Feeling sick",
  fatigue: "Tired",
  medication: "Medicine",
  sleep: "Sleep",
  cycle: "Period / Cycle",
  food: "Food / Appetite",
  mood: "Mood",
  doctor_instruction: "From my doctor",
  other: "Other",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  pain: "\u{1F915}",
  illness: "\u{1F912}",
  fatigue: "\u{1F634}",
  medication: "\u{1F48A}",
  sleep: "\u{1F6CF}",
  cycle: "\u{1F4C5}",
  food: "\u{1F37D}",
  mood: "\u{1F642}",
  doctor_instruction: "\u{1F469}\u200D\u2695\uFE0F",
  other: "\u{1F4DD}",
};

/*
  Severity shown three ways at once: the number, a face, and a word. A patient
  who cannot translate a feeling into 0-10 can still recognise the face, and a
  screen reader user gets the word.
*/
export function severityFace(severity: number): string {
  if (severity <= 1) return "\u{1F642}";
  if (severity <= 3) return "\u{1F610}";
  if (severity <= 6) return "\u{1F615}";
  if (severity <= 8) return "\u{1F623}";
  return "\u{1F62B}";
}

/**
 * The friendly label a pain event gets from its body location — shared by
 * ManualEntry and the Body Picture page so picking "Lower abdomen" produces
 * the same "Abdominal pain" label regardless of which picker was used.
 */
export function painLabelFor(location: string): string {
  if (location === "Lower abdomen" || location === "Upper abdomen") return "Abdominal pain";
  if (location === "Head") return "Headache";
  return `${location} pain`;
}

export function severityWord(severity: number): string {
  if (severity <= 1) return "Barely there";
  if (severity <= 3) return "Mild";
  if (severity <= 6) return "Moderate";
  if (severity <= 8) return "Strong";
  return "Very strong";
}
