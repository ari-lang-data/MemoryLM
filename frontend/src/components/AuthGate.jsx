import { useState, useEffect } from "react";
import { checkAuth, setApiToken } from "../lib/api";

export default function AuthGate({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "authorized" | "needs-token"
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth().then(ok => setStatus(ok ? "authorized" : "needs-token"));
  }, []);

  async function handleSubmit() {
    setError("");
    const trimmed = draft.trim();
    if (!trimmed) return;
    setApiToken(trimmed);
    const ok = await checkAuth();
    if (ok) {
      window.location.reload();
    } else {
      setApiToken("");
      setError("That token wasn't accepted — check it was copied in full.");
    }
  }

  if (status === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: "var(--color-text-tertiary)", fontSize: 13 }}>
        Checking connection…
      </div>
    );
  }

  if (status === "authorized") return children;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", gap: 14, padding: 24, background: "var(--color-background-tertiary)" }}>
      <p style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", margin: 0 }}>MemoryLM</p>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", maxWidth: 320, margin: 0 }}>
        This device isn't authorised yet. Paste the token generated for it in Settings → Devices on your computer.
      </p>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
        placeholder="Paste device token"
        style={{ width: "min(320px, 80vw)", padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13 }}
      />
      <button
        onClick={handleSubmit}
        style={{ padding: "8px 20px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", cursor: "pointer", fontSize: 13 }}
      >Connect</button>
      {error && <p style={{ fontSize: 12, color: "var(--color-text-danger)", margin: 0 }}>{error}</p>}
    </div>
  );
}