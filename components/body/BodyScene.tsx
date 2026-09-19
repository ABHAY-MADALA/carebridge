"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { BodyLoading } from "./BodyLoading";
import { Mesh, MeshPhysicalMaterial, Vector3, type BufferGeometry } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Expand, Minimize, Minus, Mouse, PersonStanding, Plus, RotateCcw } from "lucide-react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";

// The local CC0 human is 1.8 units tall, faces +Z, and has patient-left at +X.
const ANCHORS: Record<string, [number, number, number]> = {
  Head: [0, 1.68, .10], Neck: [0, 1.52, .04], Chest: [0, 1.38, .12],
  "Upper abdomen": [0, 1.19, .085], "Lower abdomen": [0, 1.04, .09], Pelvis: [0, .92, .08],
  "Left shoulder": [.205, 1.46, .025], "Right shoulder": [-.205, 1.46, .025],
  "Left arm": [.35, 1.25, .025], "Right arm": [-.35, 1.25, .025],
  "Left hand": [.52, 1.04, .01], "Right hand": [-.52, 1.04, .01],
  "Left leg": [.12, .72, .07], "Right leg": [-.12, .72, .07],
  "Left knee": [.13, .46, .09], "Right knee": [-.13, .46, .09],
  "Left foot": [.12, .045, .10], "Right foot": [-.12, .045, .10],
  Back: [0, 1.36, -.11], "Lower back": [0, 1.10, -.10],
};

function regionAt(point: Vector3, normalZ: number): string {
  const { x, y } = point, a = Math.abs(x), side = x >= 0 ? "Left" : "Right";
  if (y > 1.59) return "Head";
  if (y > 1.48 && a < .095) return "Neck";
  if (a > .44 && y > .87) return `${side} hand`;
  if (a > .25 && y > .91) return `${side} arm`;
  if (a > .16 && y > 1.38) return `${side} shoulder`;
  if (y < .13) return `${side} foot`;
  if (y < .84) return y > .40 && y < .53 ? `${side} knee` : `${side} leg`;
  if (y < .96) return "Pelvis";
  if (normalZ < -.25) return y > 1.23 ? "Back" : "Lower back";
  if (y > 1.26) return "Chest";
  return y > 1.12 ? "Upper abdomen" : "Lower abdomen";
}

type Props = { value: string | null; onChange: (id: string) => void; severity?: number | null };
type View = "front" | "back" | "left" | "right";
const ANGLES: Record<View, number> = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

function Human({ value, onChange, marker, onMarker, dark, highContrast, onReady }: Props & {
  marker: Vector3 | null; onMarker: (point: Vector3) => void; dark: boolean; highContrast: boolean; onReady: () => void;
}) {
  const model = useGLTF("/models/carebridge-human.glb");
  useEffect(() => { onReady(); }, [onReady]);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    let found: BufferGeometry | undefined;
    model.scene.traverse((node) => { if (node instanceof Mesh) found = node.geometry; });
    if (!found) throw new Error("Human model contains no geometry");
    return found;
  }, [model]);
  const uniforms = useMemo(() => ({ point: { value: new Vector3(0, -10, 0) }, enabled: { value: 0 } }), []);
  const material = useMemo(() => {
    const mat = new MeshPhysicalMaterial({ color: highContrast ? "#999999" : dark ? "#8b8177" : "#b1a69a", roughness: .78, metalness: .02, clearcoat: 0 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.cbPoint = uniforms.point;
      shader.uniforms.cbEnabled = uniforms.enabled;
      shader.vertexShader = "varying vec3 cbPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ncbPosition = position;");
      shader.fragmentShader = "uniform vec3 cbPoint;\nuniform float cbEnabled;\nvarying vec3 cbPosition;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float cbDistance = length((cbPosition - cbPoint) * vec3(1.0, 0.85, 1.4));
        float cbGlow = exp(-pow(cbDistance / 0.068, 2.0)) * cbEnabled;
        float cbRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += vec3(0.12, 0.18, 0.3) * cbRim * 0.65;
        totalEmissiveRadiance += vec3(1.0, 0.08, 0.015) * cbGlow * 1.3;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.18, 0.10), cbGlow * 0.65);`);
    };
    return mat;
  }, [dark, highContrast, uniforms]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    uniforms.enabled.value = value ? 1 : 0;
    if (value) uniforms.point.value.copy(marker ?? new Vector3(...(ANCHORS[value] ?? ANCHORS.Chest)));
    invalidate();
  }, [value, marker, uniforms, invalidate]);
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return;
    event.stopPropagation();
    const local = event.object.worldToLocal(event.point.clone());
    onMarker(local);
    onChange(regionAt(local, event.face?.normal.z ?? 1));
  };
  return <group>
    <mesh geometry={geometry} material={material} onClick={select} />
    {[-1, 1].map((side) => <mesh key={side} position={[side * .0302, 1.689, .07855]} material={material}><sphereGeometry args={[.0125, 24, 16]} /></mesh>)}
  </group>;
}

export function BodyScene({ value, onChange, severity = null }: Props) {
  const { settings } = useSettings();
  const { t, tRaw, lang } = useT();
  const labels = tRaw<Record<string, string>>("bodyMap.regions");
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [view, setView] = useState<View | null>("front");
  const [picked, setPicked] = useState<{ id: string; point: Vector3 } | null>(null);
  const hit = useRef<Vector3 | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(3.3);
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const dark = settings.theme === "dark" && !settings.highContrast;
  const marker = value && picked?.id === value ? picked.point : null;
  const setViewAngle = (next: View) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.setAzimuthalAngle(ANGLES[next]); orbit.setPolarAngle(Math.PI / 2); orbit.update(); setView(next);
  };
  const reset = () => {
    const orbit = controls.current;
    if (orbit) {
      orbit.target.set(0, .9, 0);
      orbit.object.position.set(0, .9, 3.3);
      orbit.update();
    }
    setView("front"); setZoom(3.3);
  };
  const changeZoom = (factor: number) => {
    const orbit = controls.current;
    if (!orbit) return;
    const offset = orbit.object.position.clone().sub(orbit.target);
    const distance = Math.max(2.1, Math.min(5.5, offset.length() * factor));
    orbit.object.position.copy(orbit.target).add(offset.setLength(distance)); orbit.update(); setZoom(distance);
  };
  useEffect(() => {
    if (!expanded) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = old; document.removeEventListener("keydown", escape); };
  }, [expanded]);
  return <div className={`body-3d-stage${expanded ? " is-expanded" : ""}${value ? " has-selection" : ""}`}>
    <div className="body-view-controls" aria-label={lang === "es" ? "Vista del cuerpo" : "Body view"}>
      {(["front", "back", "left", "right"] as View[]).map((v) => <button type="button" key={v} aria-pressed={view === v} onClick={() => setViewAngle(v)}>
        <PersonStanding size={23} strokeWidth={1.25} aria-hidden className={v === "left" || v === "right" ? "side-view-icon" : ""} />
        {v === "front" || v === "back" ? t(`bodyMap.${v}`) : v === "left" ? (lang === "es" ? "Izquierda" : "Left") : (lang === "es" ? "Derecha" : "Right")}
      </button>)}
    </div>
    <div className="human-canvas" role="group" aria-label={lang === "es" ? "Cuerpo 3D interactivo; también puedes usar la lista" : "Interactive 3D body; an accessible region list is available below"}>
      <Canvas camera={{ position: [0, .9, 3.3], fov: 33, near: .1, far: 30 }} dpr={[1, 1.75]} frameloop="demand" gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={dark ? .22 : .8} />
        <hemisphereLight args={["#f0e6dc", "#3c3936", .85]} />
        <directionalLight position={[-2.5, 3, 3]} color="#fff1e2" intensity={1.8} />
        <directionalLight position={[2.2, 1.2, 1]} color="#d4dbe5" intensity={.8} />
        <directionalLight position={[0, 3, -2]} color="#e6e3de" intensity={2.5} />
        <Suspense fallback={null}>
          <Human value={value} onChange={(id) => { setPicked({ id, point: hit.current?.clone() ?? new Vector3(...ANCHORS[id]) }); onChange(id); }} marker={marker} onMarker={(p) => { hit.current = p; }} dark={dark} highContrast={settings.highContrast} onReady={() => setLoaded(true)} />
        </Suspense>
        <OrbitControls ref={controls} target={[0, .9, 0]} enablePan={false} enableDamping={!settings.lowStimulation && !reducedMotion} dampingFactor={.12} minDistance={2.1} maxDistance={5.5} minPolarAngle={Math.PI / 3} maxPolarAngle={2 * Math.PI / 3} onStart={() => setView(null)} onEnd={() => { if (controls.current) { setZoom(controls.current.getDistance()); const angle = controls.current.getAzimuthalAngle(); setView((Object.keys(ANGLES) as View[]).find((v) => Math.abs(Math.atan2(Math.sin(angle - ANGLES[v]), Math.cos(angle - ANGLES[v]))) < .08) ?? null); } }} />
      </Canvas>
    </div>
    {!loaded && <BodyLoading overlay />}
    <div className="pain-legend" aria-label={lang === "es" ? "Escala de intensidad del dolor" : "Pain intensity guide"}>
      <div className="pain-legend-bar" />
      {[{ n: 10, en: "Worst pain", es: "Máximo" }, { n: 7, en: "Severe", es: "Intenso" }, { n: 4, en: "Moderate", es: "Moderado" }, { n: 1, en: "Mild", es: "Leve" }, { n: 0, en: "No pain", es: "Sin dolor" }].map((s) => <div key={s.n} className="pain-legend-label"><span>{s.n}</span><small>{lang === "es" ? s.es : s.en}</small></div>)}
      {severity !== null && <i className="pain-legend-marker" style={{ bottom: `calc(20px + (100% - 40px) * ${severity / 10})` }} />}
    </div>
    <div className="body-orbit-hint"><Mouse size={24} strokeWidth={1.2} aria-hidden /><p>{lang === "es" ? "Arrastra para girar" : "Click and drag to rotate"}<br /><span>{lang === "es" ? "Desplaza para acercar" : "Scroll to zoom"}</span></p></div>
    <div className="body-camera-controls">
      <button type="button" onClick={reset} aria-label={t("bodyMap.reset")}><RotateCcw size={18} /></button>
      <button type="button" onClick={() => changeZoom(1.15)} disabled={zoom >= 5.49} aria-label={lang === "es" ? "Alejar" : "Zoom out"}><Minus size={19} /></button>
      <button type="button" onClick={() => changeZoom(1 / 1.15)} disabled={zoom <= 2.11} aria-label={lang === "es" ? "Acercar" : "Zoom in"}><Plus size={19} /></button>
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-pressed={expanded} aria-label={expanded ? (lang === "es" ? "Cerrar vista ampliada" : "Exit expanded view") : (lang === "es" ? "Ampliar vista" : "Expand body view")}>{expanded ? <Minimize size={18} /> : <Expand size={18} />}</button>
    </div>
    <p className="body-selected-caption" aria-live="polite">{value ? labels[value] ?? value : (lang === "es" ? "Toca el cuerpo para elegir un área" : "Click on the body to choose an area")}</p>
  </div>;
}

export function clearBodyModel() { useGLTF.clear("/models/carebridge-human.glb"); }
