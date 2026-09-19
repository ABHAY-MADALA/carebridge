"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { RotateCcw } from "lucide-react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";

/*
  A small, stylized, non-anatomical figure built entirely from primitive
  Three.js geometries — no downloaded model asset (there's no asset
  pipeline in this repo), and deliberately not photorealistic: neutral,
  inclusive, clean. Every mesh below is one selectable region; React Three
  Fiber gives each mesh pointer events for free, so no manual raycasting.

  Region ids are the exact canonical strings lib/ai/fallback.ts's
  BODY_PARTS table resolves synonyms to — selecting a mesh here and typing
  "shoulder" later land on the same stored value.
*/

const NEUTRAL = "#c9c2b3";
const NEUTRAL_DARK = "#a89f8d";
const SELECTED = "#0b7c80";

type Shape =
  | { kind: "sphere"; radius: number }
  | { kind: "capsule"; radius: number; length: number }
  | { kind: "box"; size: [number, number, number] };

type Placement = {
  id: string;
  shape: Shape;
  position: [number, number, number];
  rotation?: [number, number, number];
};

// Figure stands on y=0, roughly 3.3 units tall. Deliberately generous,
// rounded proportions — a friendly abstract figure, not an anatomy model.
const PLACEMENTS: Placement[] = [
  { id: "Head", shape: { kind: "sphere", radius: 0.3 }, position: [0, 2.98, 0] },
  { id: "Neck", shape: { kind: "capsule", radius: 0.13, length: 0.08 }, position: [0, 2.62, 0] },
  { id: "Chest", shape: { kind: "capsule", radius: 0.42, length: 0.5 }, position: [0, 2.18, 0] },
  { id: "Left shoulder", shape: { kind: "sphere", radius: 0.16 }, position: [-0.52, 2.5, 0] },
  { id: "Right shoulder", shape: { kind: "sphere", radius: 0.16 }, position: [0.52, 2.5, 0] },
  {
    id: "Left arm",
    shape: { kind: "capsule", radius: 0.13, length: 0.85 },
    position: [-0.6, 1.95, 0],
    rotation: [0, 0, 0.12],
  },
  {
    id: "Right arm",
    shape: { kind: "capsule", radius: 0.13, length: 0.85 },
    position: [0.6, 1.95, 0],
    rotation: [0, 0, -0.12],
  },
  { id: "Left hand", shape: { kind: "sphere", radius: 0.12 }, position: [-0.67, 1.42, 0] },
  { id: "Right hand", shape: { kind: "sphere", radius: 0.12 }, position: [0.67, 1.42, 0] },
  { id: "Upper abdomen", shape: { kind: "capsule", radius: 0.38, length: 0.16 }, position: [0, 1.72, 0] },
  { id: "Lower abdomen", shape: { kind: "capsule", radius: 0.36, length: 0.14 }, position: [0, 1.42, 0] },
  { id: "Pelvis", shape: { kind: "capsule", radius: 0.36, length: 0.14 }, position: [0, 1.18, 0] },
  { id: "Left leg", shape: { kind: "capsule", radius: 0.17, length: 0.9 }, position: [-0.22, 0.62, 0] },
  { id: "Right leg", shape: { kind: "capsule", radius: 0.17, length: 0.9 }, position: [0.22, 0.62, 0] },
  { id: "Left knee", shape: { kind: "sphere", radius: 0.15 }, position: [-0.22, 0.58, 0.05] },
  { id: "Right knee", shape: { kind: "sphere", radius: 0.15 }, position: [0.22, 0.58, 0.05] },
  { id: "Left foot", shape: { kind: "box", size: [0.2, 0.12, 0.36] }, position: [-0.22, 0.07, 0.08] },
  { id: "Right foot", shape: { kind: "box", size: [0.2, 0.12, 0.36] }, position: [0.22, 0.07, 0.08] },
  { id: "Back", shape: { kind: "capsule", radius: 0.4, length: 0.35 }, position: [0, 2.3, -0.28], rotation: [0, 0, 0] },
  { id: "Lower back", shape: { kind: "capsule", radius: 0.34, length: 0.2 }, position: [0, 1.6, -0.24] },
];

function RegionMesh({
  placement,
  selected,
  reducedMotion,
  onSelect,
}: {
  placement: Placement;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { shape, position, rotation } = placement;

  const geometry =
    shape.kind === "sphere" ? (
      <sphereGeometry args={[shape.radius, 24, 24]} />
    ) : shape.kind === "capsule" ? (
      <capsuleGeometry args={[shape.radius, shape.length, 6, 16]} />
    ) : (
      <boxGeometry args={shape.size} />
    );

  const color = selected ? SELECTED : hovered ? NEUTRAL_DARK : NEUTRAL;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(placement.id);
  };

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {geometry}
      <meshStandardMaterial
        color={color}
        roughness={0.75}
        metalness={0}
        emissive={selected ? SELECTED : "#000000"}
        emissiveIntensity={selected ? (reducedMotion ? 0.15 : 0.25) : 0}
      />
    </mesh>
  );
}

function Figure({
  value,
  onChange,
  reducedMotion,
}: {
  value: string | null;
  onChange: (id: string) => void;
  reducedMotion: boolean;
}) {
  return (
    <group>
      {PLACEMENTS.map((p) => (
        <RegionMesh
          key={p.id}
          placement={p}
          selected={value === p.id}
          reducedMotion={reducedMotion}
          onSelect={onChange}
        />
      ))}
    </group>
  );
}

export function Body3D({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { settings } = useSettings();
  const { t } = useT();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const reducedMotion = settings.lowStimulation;

  const lights = useMemo(
    () => (
      <>
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} />
        <directionalLight position={[-2, 1, -2]} intensity={0.35} />
      </>
    ),
    [],
  );

  const setView = (azimuth: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.setAzimuthalAngle(azimuth);
    controls.update();
  };

  const reset = () => {
    controlsRef.current?.reset();
  };

  return (
    <div className="relative">
      <div className="h-[22rem] w-full overflow-hidden rounded-2xl border border-line bg-raised sm:h-[28rem]" role="img" aria-label={t("bodyMap.bodyPicture")}>
        <Canvas camera={{ position: [0, 1.65, 5.6], fov: 35 }} dpr={[1, 2]}>
          {lights}
          <Figure value={value} onChange={onChange} reducedMotion={reducedMotion} />
          <OrbitControls
            ref={controlsRef}
            target={[0, 1.6, 0]}
            enablePan={false}
            enableDamping={!reducedMotion}
            dampingFactor={0.12}
            minDistance={3}
            maxDistance={9}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 4}
          />
        </Canvas>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{t("bodyMap.rotateHint")}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setView(0)}>
            {t("bodyMap.front")}
          </button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setView(Math.PI)}>
            {t("bodyMap.back")}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={reset} aria-label={t("bodyMap.reset")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
