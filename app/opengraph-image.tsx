import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt =
  "HealthThread — accessible health communication, in your own words";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 78px",
          color: "#eef7ff",
          background:
            "radial-gradient(circle at 82% 14%, rgba(125, 204, 232, 0.22), transparent 34%), linear-gradient(135deg, #07111d 0%, #101c2b 58%, #152638 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 74,
              height: 74,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #8bd3ee",
              borderRadius: 24,
              fontSize: 42,
              color: "#8bd3ee",
            }}
          >
            HT
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 980 }}>
          <div style={{ fontSize: 68, fontWeight: 750, lineHeight: 1.03, letterSpacing: "-0.045em" }}>
            Your health story, in your own words.
          </div>
          <div style={{ fontSize: 27, lineHeight: 1.4, color: "#b9cadc" }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#91a7bd" }}>
          <div>Accessible health communication</div>
          <div>Synthetic public demo · Not a diagnosis</div>
        </div>
      </div>
    ),
    size,
  );
}
