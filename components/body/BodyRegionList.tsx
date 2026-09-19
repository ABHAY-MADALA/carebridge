"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/a11y/useT";
import { BODY_REGIONS } from "@/lib/body/regions";

/*
  Plain buttons, same canonical region ids as Body3D. This is what makes the
  whole selection flow keyboard- and screen-reader-operable independent of
  whether the WebGL canvas renders at all — never the only way in.
*/
export function BodyRegionList({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  const { tRaw } = useT();
  const labels = tRaw<Record<string, string>>("bodyMap.regions");

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {BODY_REGIONS.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onChange(r.id)}
            aria-pressed={value === r.id}
            className={cn(
              "btn btn-sm",
              value === r.id ? "btn-primary" : "btn-secondary",
            )}
          >
            {labels[r.id] ?? r.id}
          </button>
        </li>
      ))}
    </ul>
  );
}
