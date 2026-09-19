"use client";

import { cn } from "@/lib/utils";

/*
  A 0-10 scale with a face and a word on every step. A bare number line asks
  the patient to translate a feeling into maths; the faces and the words give
  two other ways in, which is the entire point of CareBridge.
*/

const FACES = [
  { face: "\u{1F642}", word: "None" },
  { face: "\u{1F642}", word: "Barely there" },
  { face: "\u{1F610}", word: "Mild" },
  { face: "\u{1F610}", word: "Mild" },
  { face: "\u{1F615}", word: "Uncomfortable" },
  { face: "\u{1F615}", word: "Moderate" },
  { face: "\u{1F623}", word: "Hard to ignore" },
  { face: "\u{1F623}", word: "Bad" },
  { face: "\u{1F630}", word: "Very bad" },
  { face: "\u{1F62B}", word: "Awful" },
  { face: "\u{1F62B}", word: "Worst possible" },
];

export function SeverityScale({
  value,
  onChange,
  label = "How strong is it?",
}: {
  value: number | null;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {FACES.map((f, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            onClick={() => onChange(i)}
            className={cn(
              "flex min-h-[4.5rem] w-[4.2rem] flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-2",
              value === i
                ? "border-brand bg-brand text-brand-ink"
                : "border-line bg-surface hover:bg-raised",
            )}
          >
            <span aria-hidden className="text-2xl leading-none">
              {f.face}
            </span>
            <span className="text-lg font-bold leading-none">{i}</span>
            <span className="text-center text-[0.65rem] leading-tight">{f.word}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {value === null ? "Nothing chosen yet." : `You chose ${value} out of 10 — ${FACES[value].word.toLowerCase()}.`}
      </p>
    </fieldset>
  );
}
