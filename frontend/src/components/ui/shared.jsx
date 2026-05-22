export function Card({ children, style = {} }) {
  return (
    <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500 }}>{children}</p>;
}

export function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 210, flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  );
}