/*
  The single list of selectable body regions — both Body3D (the 3D picker)
  and BodyRegionList (the accessible fallback) read from this, so the two
  interaction methods can never drift apart. Every `id` here is a string
  lib/ai/fallback.ts's BODY_PARTS table already recognizes (or the exact
  canonical value it resolves a synonym to) — this is what gets stored as
  HealthEvent.bodyLocation, so it stays English regardless of UI language.
*/

export type BodyView = "front" | "back";

export type BodyRegion = {
  id: string;
  view: BodyView;
  /** Roughly where the mesh sits, head (y=1) to feet (y=0), for camera framing. */
  height: "upper" | "mid" | "lower";
};

export const BODY_REGIONS: BodyRegion[] = [
  { id: "Head", view: "front", height: "upper" },
  { id: "Neck", view: "front", height: "upper" },
  { id: "Chest", view: "front", height: "upper" },
  { id: "Left shoulder", view: "front", height: "upper" },
  { id: "Right shoulder", view: "front", height: "upper" },
  { id: "Left arm", view: "front", height: "mid" },
  { id: "Right arm", view: "front", height: "mid" },
  { id: "Left hand", view: "front", height: "mid" },
  { id: "Right hand", view: "front", height: "mid" },
  { id: "Upper abdomen", view: "front", height: "mid" },
  { id: "Lower abdomen", view: "front", height: "mid" },
  { id: "Pelvis", view: "front", height: "mid" },
  { id: "Left leg", view: "front", height: "lower" },
  { id: "Right leg", view: "front", height: "lower" },
  { id: "Left knee", view: "front", height: "lower" },
  { id: "Right knee", view: "front", height: "lower" },
  { id: "Left foot", view: "front", height: "lower" },
  { id: "Right foot", view: "front", height: "lower" },
  { id: "Back", view: "back", height: "upper" },
  { id: "Lower back", view: "back", height: "mid" },
];
