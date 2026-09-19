"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/a11y/useT";

/*
  A 0-10 scale with a face and a word on every step. A bare number line asks
  the patient to translate a feeling into maths; the faces and the words give
  two other ways in, which is the entire point of HealthThread.
*/

const FACES = [
  "\u{1F642}",
  "\u{1F642}",
  "\u{1F610}",
  "\u{1F610}",
  "\u{1F615}",
  "\u{1F615}",
  "\u{1F623}",
  "\u{1F623}",
  "\u{1F630}",
  "\u{1F62B}",
  "\u{1F62B}",
];

export function SeverityScale({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label?: string;
}) {
  const { t, tRaw } = useT();
  const words = tRaw<string[]>("severityScale.words");
  const resolvedLabel = label ?? t("severityScale.defaultLabel");

  return (
    <fieldset>
      <legend className="label">{resolvedLabel}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={resolvedLabel}>
        {FACES.map((face, i) => (
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
              {face}
            </span>
            <span className="text-lg font-bold leading-none">{i}</span>
            <span className="text-center text-[0.65rem] leading-tight">{words[i]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {value === null ? t("severityScale.nothingChosen") : t("severityScale.youChose", { value, word: words[value].toLowerCase() })}
      </p>
    </fieldset>
  );
}
