"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BodyPickerErrorBoundary } from "./BodyPickerErrorBoundary";
import { BodyRegionList } from "./BodyRegionList";
import { useT } from "@/components/a11y/useT";
import { AnatomyMap } from "./AnatomyMap";
import { BodyLoading } from "./BodyLoading";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { baseBodyLocation, preciseBodyLocation, type BodySurface } from "@/lib/body/regions";

/*
  The drop-in replacement for the old 2D BodyMap everywhere the flagship
  experience is wanted (the dedicated Body Picture page, inline in "Tell
  HealthThread," inline in Guided Check-In) — same {value, onChange} contract.
  QuickPhrases.tsx keeps the plain 2D BodyMap deliberately (a fast in-
  appointment tap, not the immersive flow).

  The 3D canvas is lazy-loaded so its ~kB never ships to a route that
  doesn't render it, and the accessible region list is always present
  underneath — the canvas is a shortcut to the same selection, never the
  only way to make it.
*/
const Body3D = dynamic(() => import("./BodyScene").then((m) => m.BodyScene), {
  ssr: false,
  loading: () => (
    <BodyLoading />
  ),
});

export function BodyPicker({
  value,
  onChange,
  severity = null,
}: {
  value: string | null;
  onChange: (id: string) => void;
  severity?: number | null;
}) {
  const { t, lang } = useT();
  const [attempt, setAttempt] = useState(0);
  const [showList, setShowList] = useState(false);
  const [threeDimensional, setThreeDimensional] = useState(true);
  const selectedBase = baseBodyLocation(value);
  const select = (id: string, surface: BodySurface) => onChange(preciseBodyLocation(id, surface));

  return (
    <div className="body-picker">
      {threeDimensional ? (
      <BodyPickerErrorBoundary
        key={attempt}
        fallback={
          <div className="rounded-2xl border border-line bg-raised p-4">
            <p className="text-sm text-muted">{t("bodyMap.loadFailed")}</p>
            <button type="button" className="btn btn-sm btn-secondary my-3" onClick={async () => { try { const scene = await import("./BodyScene"); scene.clearBodyModel(); } catch { /* Boundary keeps the alternatives available if the chunk is offline. */ } finally { setAttempt(a => a + 1); } }}>{lang === "es" ? "Reintentar cuerpo 3D" : "Retry 3D body"}</button>
            <AnatomyMap value={selectedBase} onChange={select} />
            <BodyRegionList value={selectedBase} onChange={select} className="mt-3" />
          </div>
        }
      >
        <Body3D value={selectedBase} onChange={select} severity={severity} />
      </BodyPickerErrorBoundary>
      ) : <AnatomyMap value={selectedBase} onChange={select} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        className="btn btn-sm btn-ghost mt-3"
        onClick={() => setShowList((v) => !v)}
        aria-expanded={showList}
      >
        {showList ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {showList ? t("bodyMap.hideList") : t("bodyMap.preferList")}
      </button>
      <SegmentedControl ariaLabel={lang === "es" ? "Presentación del cuerpo" : "Body presentation"} value={threeDimensional ? "3d" : "2d"} onChange={v => setThreeDimensional(v === "3d")} options={[{ value: "3d", label: lang === "es" ? "Cuerpo 3D" : "3D body" }, { value: "2d", label: lang === "es" ? "Mapa corporal 2D" : "2D body map" }]} />
      </div>

      {showList && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-muted">{t("bodyMap.chooseFromList")}</p>
          <BodyRegionList value={selectedBase} onChange={select} />
        </div>
      )}
    </div>
  );
}
