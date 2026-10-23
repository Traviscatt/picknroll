import { ImageResponse } from "next/og";

// Default share image for links to picknroll.net (invites, the landing page)
export const alt = "Pick N Roll: NCAA bracket pool with multi-choice scoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#29503c", color: "#ffffff" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          Pick<span style={{ color: "#b9bc91" }}>N</span>Roll
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 16, color: "#e8ead6" }}>Make every pick count.</div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 48, color: "#b9bc91" }}>NCAA bracket pool · rank your picks from the Sweet 16 on · live Game Center</div>
      </div>
    ),
    size
  );
}
