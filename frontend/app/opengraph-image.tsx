import { ImageResponse } from "next/og";

export const alt = "DigiNova — Le meilleur du digital, à portée de clic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage par défaut (réseaux sociaux, WhatsApp). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#1E1B4B", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#635BFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>✦</div>
          <div style={{ fontSize: 48, fontWeight: 700 }}>DigiNova</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Le meilleur du digital, à portée de clic.</div>
          <div style={{ fontSize: 30, color: "#C7D2FE" }}>Business plans, templates, e-books · Payez en Mobile Money · Téléchargement immédiat</div>
        </div>
      </div>
    ),
    size,
  );
}
