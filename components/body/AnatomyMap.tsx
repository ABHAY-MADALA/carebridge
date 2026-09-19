"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw, MousePointer2 } from "lucide-react";
import { useT } from "@/components/a11y/useT";

type Props = { value: string | null; onChange: (id: string) => void };

/** Original vector anatomy, split into the same canonical regions as the record.
 * Front-view left/right are the patient's, not the viewer's. */
function Figure({ back, value, onChange }: Props & { back: boolean }) {
  const { tRaw, lang } = useT();
  const labels = tRaw<Record<string, string>>("bodyMap.regions");
  function region(id: string, children: ReactNode) {
    return <g key={id} className="anatomy-region" role="button" tabIndex={0} aria-label={`${back ? (lang === "es" ? "Espalda" : "Back view") : (lang === "es" ? "Frente" : "Front view")}: ${labels[id] ?? id}`} aria-pressed={value === id} onClick={() => onChange(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(id); } }}>{children}</g>;
  }
  return (
    <svg className="anatomy-figure" viewBox="0 0 240 600" role="group" aria-label={back ? "Back body regions" : "Front body regions"}>
      {region("Head", <path d="M120 12C101 12 95 24 95 42l2 16c-6-6-7 2-3 11l5 4c3 13 12 23 21 23s18-10 21-23l5-4c4-9 3-17-3-11l2-16c0-18-6-30-25-30Z" />)}
      {region("Neck", <path d="M104 86v18l-15 13 31 21 31-21-15-13V86c-10 13-22 13-32 0Z" />)}
      {[-1, 1].map((side) => {
        const name = back ? (side === -1 ? "Left" : "Right") : (side === -1 ? "Right" : "Left");
        return <g key={side} transform={side === 1 ? "translate(240 0) scale(-1 1)" : undefined}>
          {region(`${name} shoulder`, <path d="M86 112c-22 0-35 10-39 26l-5 22c14 1 27-8 32-22Z" />)}
          {region(`${name} upper arm`, <path d="M43 161c10 0 21-6 28-14-1 28-8 53-20 72l-15-6c0-17 0-34 7-52Z" />)}
          {region(`${name} forearm`, <path d="M36 214c7 1 12 3 16 7-3 22-14 46-26 66l-12-5c4-21 14-49 22-68Z" />)}
          {region(`${name} elbow`, <path d="M35 207c6-2 12 0 17 5l-1 11c-5 4-11 3-16-1Z" />)}
          {region(`${name} hand`, <path d="m14 284 12 5 1 14 10 12c2 4-1 6-4 3l-7-7 2 24c0 4-4 4-5 0l-3-18 0 25c-1 4-4 4-5 0l-1-25-3 23c-1 4-4 3-4-1l2-23-4 17c-1 4-5 2-4-2l4-23Z" />)}
          {region(`${name} thigh`, <path d="M82 298c9 13 20 21 35 24l-6 57-8 48-23 1c-9-28-14-53-11-77 1-17 5-35 13-53Z" />)}
          {region(`${name} lower leg`, <path d="M80 451c7 5 14 5 21 0 3 25 1 47-4 68l-5 40H80l-3-41c-6-22-8-43 3-67Z" />)}
          {region(`${name} knee`, <path d="M80 430c8-4 16-4 23-1l-1 20c-6 9-16 9-23 0Z" />)}
          {region(`${name} foot`, <path d="M79 560h14l4 18c3 8-1 13-8 13H65c-5-2-4-8 1-12l11-10Z" />)}
        </g>;
      })}
      {back ? <>
        {region("Left upper back", <path d="M89 113c10 8 18 12 31 17v99H98l-12-29-14-60Z" />)}
        {region("Right upper back", <path d="M151 113c-10 8-18 12-31 17v99h22l12-29 14-60Z" />)}
        {region("Left lower back", <path d="M98 231h22v65l-32-24Z" />)}
        {region("Right lower back", <path d="M142 231h-22v65l32-24Z" />)}
        {region("Left pelvis", <path d="m88 274 32 23v23c-11 10-26 7-38-8-3-11-1-24 6-38Z" />)}
        {region("Right pelvis", <path d="m152 274-32 23v23c11 10 26 7 38-8 3-11 1-24-6-38Z" />)}
      </> : <>
        {region("Right chest", <path d="M88 114c12 7 20 12 32 14v58c-11 7-24 3-37-7l-10-39Z" />)}
        {region("Left chest", <path d="M152 114c-12 7-20 12-32 14v58c11 7 24 3 37-7l10-39Z" />)}
        {region("Right upper abdomen", <path d="M84 183c13 8 25 12 36 6v60H96l-1-27Z" />)}
        {region("Left upper abdomen", <path d="M156 183c-13 8-25 12-36 6v60h24l1-27Z" />)}
        {region("Right lower abdomen", <path d="M95 251h25v51l-31-28Z" />)}
        {region("Left lower abdomen", <path d="M145 251h-25v51l31-28Z" />)}
        {region("Right pelvis", <path d="m87 278 33 27v22c-17-4-31-16-39-29Z" />)}
        {region("Left pelvis", <path d="m153 278-33 27v22c17-4 31-16 39-29Z" />)}
      </>}
      <g className="anatomy-detail" fill="none" pointerEvents="none" strokeLinecap="round" strokeLinejoin="round">
        {back ? <>
          <path d="M120 103v183m-29-163 29 29 29-29m-65 36c15-4 24 2 36 20 12-18 21-24 36-20m-66 38 30 28 30-28m-48 41 18-13 18 13m-42 34 24-21 24 21m-24 37v22" />
          <path d="m108 83 12-8 12 8m-12-11V27" />
        </> : <>
          <path d="M120 130v163m-25-91c7-3 15-3 25 0 10-3 18-3 25 0m-48 18c8-3 16-3 23 0 7-3 15-3 23 0m-46 18c8-3 16-3 23 0 7-3 15-3 23 0m-22 19h-2m-27 1 16 25m39-25-16 25" />
          <path d="m101 46 9-3m20 0 9 3m-20 2-4 15h10m-16 11c7 4 15 4 22 0m-23-56 12 19 12-19m-26 77 14 28 14-28m-51 32c16-6 28-3 37 2 9-5 21-8 37-2" />
          <path d="m87 188 12 18m-9 0 9 17m54-35-12 18m9 0-9 17" />
        </>}
        {[-1, 1].map((s) => <g key={s} transform={s === 1 ? "translate(240 0) scale(-1 1)" : undefined}>
          <path d="M58 148c-7 26-6 43-12 60m-8 15c-1 20-9 38-18 54m29-52-23 47M84 321c-6 34-4 66 4 98m20-89-15 88m-8 18 12 1m-16 21c-5 20-2 37 4 54l1 38m10-85-10 48m-6 60 10 8" />
        </g>)}
      </g>
    </svg>
  );
}

export function AnatomyMap({ value, onChange }: Props) {
  const [view, setView] = useState<"both" | "front" | "back">("both");
  const [zoom, setZoom] = useState(1);
  const { t, tRaw, lang } = useT();
  const labels = tRaw<Record<string, string>>("bodyMap.regions");
  return (
    <div className="anatomy-stage">
      <div className="anatomy-toolbar">
        <div className="view-tabs" aria-label={lang === "es" ? "Vista del cuerpo" : "Body view"}>
          {(["both", "front", "back"] as const).map((v) => <button type="button" key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "both" ? (lang === "es" ? "Ambos lados" : "Both sides") : t(`bodyMap.${v}`)}</button>)}
        </div>
        <span className="anatomy-key"><i />{lang === "es" ? "Área seleccionada" : "Selected area"}</span>
      </div>
      <div className="anatomy-drawings">
        <div className="anatomy-pair" style={{ transform: `scale(${zoom})` }}>
          {view !== "back" && <div className="anatomy-column"><Figure value={value} onChange={onChange} back={false} /><span>{t("bodyMap.front")}</span></div>}
          {view !== "front" && <div className="anatomy-column"><Figure value={value} onChange={onChange} back /><span>{t("bodyMap.back")}</span></div>}
        </div>
      </div>
      <div className="anatomy-bottom">
        <p aria-live="polite"><MousePointer2 size={15} aria-hidden />{value ? labels[value] ?? value : (lang === "es" ? "Toca donde lo sientes" : "Tap where you feel it")}</p>
        <div className="anatomy-zoom">
          <button type="button" aria-label={lang === "es" ? "Alejar" : "Zoom out"} disabled={zoom <= 0.8} onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}><Minus size={15} /></button>
          <button type="button" aria-label={t("bodyMap.reset")} onClick={() => { setZoom(1); setView("both"); }}><RotateCcw size={15} /></button>
          <button type="button" aria-label={lang === "es" ? "Acercar" : "Zoom in"} disabled={zoom >= 1.4} onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}><Plus size={15} /></button>
        </div>
      </div>
    </div>
  );
}
