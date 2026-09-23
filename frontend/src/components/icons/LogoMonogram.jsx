export default function LogoMonogram({ size = 88 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-primary)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: size * 0.42, color: "var(--color-app-name)" }}>M</span>
    </div>
  );
}