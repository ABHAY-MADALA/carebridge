"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/*
  A row of mutually-exclusive choices — the mood check on Home, onset/
  descriptor chips elsewhere. Not a pill-shaped toggle switch; a real
  radiogroup of equally-weighted options, each a 44px+ touch target.
*/
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value || (value === null && options[0] === o) ? 0 : -1}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
            e.preventDefault();
            const index = options.indexOf(o);
            const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1) + options.length) % options.length;
            onChange(options[next].value);
            (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
          }}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            value === o.value
              ? "border-brand bg-brand text-brand-ink"
              : "border-line bg-surface text-ink hover:bg-raised",
          )}
        >
          {o.icon}
          {o.label}
          {value === o.value && <Check size={14} aria-hidden />}
        </button>
      ))}
    </div>
  );
}
