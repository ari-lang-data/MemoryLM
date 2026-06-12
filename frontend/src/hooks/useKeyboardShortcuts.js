import { useEffect } from "react";

/**
 * Global keyboard shortcut handler.
 * Panel-scoped shortcuts (graph R/F/A/C/H, characters N/E/Del)
 * are handled inside their respective components — this hook
 * covers universal and navigation shortcuts only.
 */
export function useKeyboardShortcuts({
  activePanel,
  setActivePanel,
  config,
  onOpenSettings,
  onOpenShortcuts,
  onRegenerate,
  onFastForward,
  loading,
}) {
  useEffect(() => {
    function handler(e) {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key   = e.key;

      // ── Navigation ──────────────────────────────────────────────────────
      if (ctrl && key === "1") { e.preventDefault(); setActivePanel("chat"); return; }
      if (ctrl && key === "2") { e.preventDefault(); setActivePanel("memory"); return; }
      if (ctrl && key === "3") { e.preventDefault(); setActivePanel("lorebook"); return; }
      if (ctrl && key === "6") { e.preventDefault(); setActivePanel("graph"); return; }
      if (ctrl && key === "7") {
        e.preventDefault();
        if (config?.style === "roleplay") setActivePanel("characters");
        return;
      }

      // ── General ─────────────────────────────────────────────────────────
      if (ctrl && key === ",")  { e.preventDefault(); onOpenSettings();  return; }
      if (key === "F1")         { e.preventDefault(); onOpenShortcuts(); return; }

      // ── Chat ────────────────────────────────────────────────────────────
      if (ctrl && shift && key === "Enter" && activePanel === "chat") {
        e.preventDefault();
        if (!loading) onRegenerate();
        return;
      }
      if (ctrl && shift && key === "F" && activePanel === "chat") {
        e.preventDefault();
        if (!loading) onFastForward();
        return;
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activePanel, config, loading, onOpenSettings, onOpenShortcuts, onRegenerate, onFastForward, setActivePanel]);
}