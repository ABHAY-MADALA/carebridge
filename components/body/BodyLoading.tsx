"use client";
import { useT } from "@/components/a11y/useT";

export function BodyLoading({ overlay = false }: { overlay?: boolean }) {
  const { lang } = useT();
  return <div className={overlay ? "body-loading-overlay" : "body-3d-stage body-loading-shell"} role="status" aria-live="polite">
    <svg viewBox="0 0 240 560" className="body-loading-silhouette" aria-hidden="true">
      <path fill="currentColor" d="M120 14c-24 0-30 20-28 43 1 16 8 26 14 30v22l-33 15c-15 7-22 31-26 52L16 265c-8 21-8 38-3 42 8 4 16-22 20-29l44-91 11 81-13 141 10 124-10 14c-6 9 5 12 22 9l7-9 3-140 13-94 13 94 3 140 7 9c17 3 28 0 22-9l-10-14 10-124-13-141 11-81 44 91c4 7 12 33 20 29 5-4 5-21-3-42l-31-89c-4-21-11-45-26-52l-33-15V87c6-4 13-14 14-30 2-23-4-43-28-43z" />
    </svg>
    <p>{lang === "es" ? "Preparando el cuerpo interactivo…" : "Preparing your interactive body…"}</p>
    <span>{lang === "es" ? "También puedes elegir un área de la lista." : "You can also choose an area from the list below."}</span>
  </div>;
}
