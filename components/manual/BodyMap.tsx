"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/a11y/useT";

/*
  A body map for people who would rather point than describe.

  Every region is a real <button> with a label, so it works with a keyboard,
  with a screen reader, and with a finger. A picture that only works with a
  mouse would defeat the purpose of having one.

  `id` is what gets stored as bodyLocation and matched by lib/ai/fallback.ts's
  BODY_PARTS table — stays English always. Only the displayed label (read
  from lib/i18n/messages.ts's bodyMap.regions) is translated.
*/

type Region = {
  id: string;
  /** Percentage box over the figure. */
  x: number;
  y: number;
  w: number;
  h: number;
};

const REGIONS: Region[] = [
  { id: "Head", x: 38, y: 1, w: 24, h: 12 },
  { id: "Throat", x: 42, y: 13, w: 16, h: 5 },
  { id: "Chest", x: 33, y: 18, w: 34, h: 13 },
  { id: "Shoulder", x: 17, y: 18, w: 16, h: 8 },
  { id: "Arm", x: 12, y: 26, w: 12, h: 22 },
  { id: "Upper abdomen", x: 33, y: 31, w: 34, h: 9 },
  { id: "Lower abdomen", x: 33, y: 40, w: 34, h: 10 },
  { id: "Pelvis", x: 33, y: 50, w: 34, h: 8 },
  { id: "Hand", x: 10, y: 48, w: 12, h: 8 },
  { id: "Leg", x: 33, y: 58, w: 34, h: 22 },
  { id: "Knee", x: 33, y: 80, w: 34, h: 8 },
  { id: "Foot", x: 33, y: 88, w: 34, h: 10 },
];

const BACK_REGIONS: Region[] = [
  { id: "Back", x: 33, y: 20, w: 34, h: 15 },
  { id: "Lower back", x: 33, y: 35, w: 34, h: 13 },
];

export function BodyMap({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (location: string) => void;
}) {
  const { t, tRaw } = useT();
  const labels = tRaw<Record<string, string>>("bodyMap.regions");

  return (
    <div>
      <p className="label">{t("bodyMap.whereFeel")}</p>

      <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <div
          className="relative mx-auto aspect-[1/2.2] w-full max-w-[14rem] rounded-2xl border-2 border-line bg-raised"
          role="group"
          aria-label={t("bodyMap.bodyPicture")}
        >
          {/* A simple figure drawn behind the buttons, purely decorative. */}
          <svg
            viewBox="0 0 100 220"
            className="absolute inset-0 h-full w-full text-line"
            aria-hidden
          >
            <circle cx="50" cy="18" r="13" fill="currentColor" opacity="0.35" />
            <rect x="34" y="34" width="32" height="62" rx="12" fill="currentColor" opacity="0.35" />
            <rect x="16" y="38" width="14" height="60" rx="7" fill="currentColor" opacity="0.35" />
            <rect x="70" y="38" width="14" height="60" rx="7" fill="currentColor" opacity="0.35" />
            <rect x="36" y="96" width="12" height="100" rx="6" fill="currentColor" opacity="0.35" />
            <rect x="52" y="96" width="12" height="100" rx="6" fill="currentColor" opacity="0.35" />
          </svg>

          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r.id)}
              aria-pressed={value === r.id}
              className={cn(
                "absolute rounded-lg border-2 text-[0.65rem] font-semibold transition-colors",
                value === r.id
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-transparent bg-transparent hover:border-brand hover:bg-brand-soft",
              )}
              style={{
                left: `${r.x}%`,
                top: `${r.y}%`,
                width: `${r.w}%`,
                height: `${r.h}%`,
              }}
            >
              <span className="sr-only">{labels[r.id] ?? r.id}</span>
            </button>
          ))}
        </div>

        {/*
          The same regions as plain buttons. Some people cannot use the picture
          at all, and a list is faster for anyone who already knows the word.
        */}
        <div>
          <p className="text-sm text-muted">{t("bodyMap.tapOrChoose")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {[...REGIONS, ...BACK_REGIONS].map((r) => (
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
        </div>
      </div>
    </div>
  );
}
