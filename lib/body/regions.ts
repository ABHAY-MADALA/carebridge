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
  { id: "Center face", view: "front", height: "upper" },
  { id: "Left face", view: "front", height: "upper" },
  { id: "Right face", view: "front", height: "upper" },
  { id: "Left ear", view: "front", height: "upper" },
  { id: "Right ear", view: "front", height: "upper" },
  { id: "Neck", view: "front", height: "upper" },
  { id: "Center chest", view: "front", height: "upper" },
  { id: "Left chest", view: "front", height: "upper" },
  { id: "Right chest", view: "front", height: "upper" },
  { id: "Left shoulder", view: "front", height: "upper" },
  { id: "Right shoulder", view: "front", height: "upper" },
  { id: "Left armpit", view: "front", height: "upper" },
  { id: "Right armpit", view: "front", height: "upper" },
  { id: "Left upper arm", view: "front", height: "upper" },
  { id: "Right upper arm", view: "front", height: "upper" },
  { id: "Left elbow", view: "front", height: "mid" },
  { id: "Right elbow", view: "front", height: "mid" },
  { id: "Left forearm", view: "front", height: "mid" },
  { id: "Right forearm", view: "front", height: "mid" },
  { id: "Left hand", view: "front", height: "mid" },
  { id: "Right hand", view: "front", height: "mid" },
  { id: "Center upper abdomen", view: "front", height: "mid" },
  { id: "Left upper abdomen", view: "front", height: "mid" },
  { id: "Right upper abdomen", view: "front", height: "mid" },
  { id: "Center lower abdomen", view: "front", height: "mid" },
  { id: "Left lower abdomen", view: "front", height: "mid" },
  { id: "Right lower abdomen", view: "front", height: "mid" },
  { id: "Center pelvis", view: "front", height: "mid" },
  { id: "Left pelvis", view: "front", height: "mid" },
  { id: "Right pelvis", view: "front", height: "mid" },
  { id: "Left thigh", view: "front", height: "lower" },
  { id: "Right thigh", view: "front", height: "lower" },
  { id: "Left knee", view: "front", height: "lower" },
  { id: "Right knee", view: "front", height: "lower" },
  { id: "Left lower leg", view: "front", height: "lower" },
  { id: "Right lower leg", view: "front", height: "lower" },
  { id: "Left foot", view: "front", height: "lower" },
  { id: "Right foot", view: "front", height: "lower" },
  { id: "Center upper back", view: "back", height: "upper" },
  { id: "Left upper back", view: "back", height: "upper" },
  { id: "Right upper back", view: "back", height: "upper" },
  { id: "Center lower back", view: "back", height: "mid" },
  { id: "Left lower back", view: "back", height: "mid" },
  { id: "Right lower back", view: "back", height: "mid" },
];

/** Maps a point on the patient-facing human mesh to the stored location. The
 * x-axis is patient-relative: positive is the patient's left. */
export function bodyRegionAt(point: { x: number; y: number }, normalZ: number): string {
  const { x, y } = point;
  const distanceFromCenter = Math.abs(x);
  const side = x >= 0 ? "Left" : "Right";
  const sided = (part: string) => distanceFromCenter < .045 ? `Center ${part}` : `${side} ${part}`;
  if (y > 1.59) {
    if (distanceFromCenter > .052 && y < 1.75) return `${side} ear`;
    if (normalZ > .18 && y < 1.72) {
      return distanceFromCenter < .018 ? "Center face" : `${side} face`;
    }
    return "Head";
  }
  if (y > 1.48 && distanceFromCenter < .095) return "Neck";
  if (distanceFromCenter > .44 && y > .87) return `${side} hand`;
  if (distanceFromCenter >= .165 && distanceFromCenter <= .22 && y > 1.27 && y < 1.40 && normalZ > -.2) return `${side} armpit`;
  if (distanceFromCenter > .18 && y > 1.32) return `${side} shoulder`;
  if (distanceFromCenter > .27 && y > 1.08 && y < 1.18) return `${side} elbow`;
  if (distanceFromCenter > .19 && y > 1.17) return `${side} upper arm`;
  if (distanceFromCenter > .23 && y > .87) return `${side} forearm`;
  if (y < .13) return `${side} foot`;
  if (y < .40) return `${side} lower leg`;
  if (y < .54) return `${side} knee`;
  if (y < .84) return `${side} thigh`;
  if (y < .96) return sided("pelvis");
  if (normalZ < -.25) return sided(y > 1.23 ? "upper back" : "lower back");
  if (y > 1.26) return sided("chest");
  return sided(y > 1.12 ? "upper abdomen" : "lower abdomen");
}
