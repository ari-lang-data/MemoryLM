import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ChevronRight, ChevronLeft, FileText, Pin, X, Users, MapPin, Flag, Gem, Calendar, Scroll, Scale, Tag } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";
import { GOLD_TEXT } from "../lib/lorebookCover";
import LorebookCover from "./LorebookCover";

const TYPE_ICONS = { character: Users, location: MapPin, faction: Flag, item: Gem, event: Calendar, lore: Scroll, rule: Scale, other: Tag };
const PAPER = { page: "#efe4cc", ink: "#2b2118", soft: "#6b5a45", rule: "#cdbb9a", accent: "#8a5a22" };
const label = t => ({ lore: "Lore", other: "Other" }[t] ?? t.charAt(0).toUpperCase() + t.slice(1) + "s");

function useSpreadSize() {
  const compute = () => {
    const H = Math.min(window.innerHeight * 0.86, 700, (window.innerWidth * 0.94 / 2) * 1.25);
    return { H: Math.round(H), P: Math.round(H * 0.8) };
  };
  const [size, setSize] = useState(compute);
  useEffect(() => {
    const on = () => setSize(compute());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

export default function LorebookBook({ book, worldName, originRect, entries, typeColors, loreTypes, onClose, onNewEntry, onOpenEntry, escapeEnabled }) {
  const isMobile = useIsMobile();
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const { H, P } = useSpreadSize();
  const cap = book.entry_cap ?? 150;
  const full = entries.length >= cap;

  const [phase, setPhase]       = useState(!reduceMotion && (isMobile || originRect) ? "enter" : "done");
  const [closing, setClosing]   = useState(false);
  const [category, setCategory] = useState(null);
  const [query, setQuery]       = useState("");
  const opened = phase === "open" || phase === "done";

  useEffect(() => {
    if (phase === "enter") {
      let r2;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setPhase(isMobile ? "open" : "expand")); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    if (phase === "expand") { const t = setTimeout(() => setPhase("open"), 380); return () => clearTimeout(t); }
    if (phase === "open")   { const t = setTimeout(() => setPhase("done"), isMobile ? 520 : 580); return () => clearTimeout(t); }
  }, [phase, isMobile]);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, reduceMotion ? 0 : 220);
  }
  useEffect(() => {
    if (!escapeEnabled) return;
    const k = e => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [escapeEnabled, closing]);

  const counts = useMemo(() => {
    const c = {};
    entries.forEach(e => { const t = e.type ?? "other"; c[t] = (c[t] ?? 0) + 1; });
    return c;
  }, [entries]);

  const q = query.trim().toLowerCase();
  const listed = useMemo(() => {
    if (!category && !q) {
      return entries.slice().sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")).slice(0, 6);
    }
    return entries
      .filter(e => (!category || (e.type ?? "other") === category) &&
        (!q || e.title.toLowerCase().includes(q) || (e.tags ?? "").toLowerCase().includes(q) || e.content.toLowerCase().includes(q)))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [entries, category, q]);
  const heading = category ? label(category) : q ? `Results for “${query.trim()}”` : "Recent entries";

  // ── shared pieces (called as functions, not components, so inputs keep focus) ──
  const searchBox = (
    <div style={{ position: "relative" }}>
      <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: PAPER.soft }} />
      <input
        value={query} onChange={e => setQuery(e.target.value)} placeholder="Search entries…"
        style={{ width: "100%", padding: "8px 10px 8px 30px", background: "rgba(255,255,255,.45)", border: `1px solid ${PAPER.rule}`, borderRadius: 8, color: PAPER.ink, fontSize: isMobile ? 16 : 13, outline: "none" }}
      />
    </div>
  );

  const renderCategory = type => {
    const Icon = TYPE_ICONS[type] ?? Tag;
    const color = typeColors[type] ?? "#888780";
    const active = category === type;
    const n = counts[type] ?? 0;
    return (
      <button key={type} onClick={() => setCategory(active ? null : type)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 6px", cursor: "pointer", border: "none", borderBottom: `1px solid ${PAPER.rule}`, background: active ? "rgba(138,90,34,.14)" : "transparent", color: PAPER.ink }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: color + "26", color }}><Icon size={15} /></span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{label(type)}</span>
          <span style={{ display: "block", fontSize: 11, color: PAPER.soft }}>{n} {n === 1 ? "entry" : "entries"}</span>
        </span>
        <ChevronRight size={14} color={PAPER.soft} />
      </button>
    );
  };

  const renderRow = e => (
    <button key={e.id} onClick={() => onOpenEntry(e)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 4px", cursor: "pointer", border: "none", borderBottom: `1px solid ${PAPER.rule}`, background: "transparent", color: PAPER.ink }}>
      <FileText size={18} color={PAPER.soft} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: PAPER.soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.content}</span>
      </span>
      {e.pinned && <Pin size={12} color={PAPER.accent} />}
      <ChevronRight size={15} color={PAPER.soft} />
    </button>
  );

  const newEntryBtn = (
    <button onClick={onNewEntry} disabled={full} title={full ? `This lorebook is full (${cap})` : "New entry"}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#f3e3b8", background: "#2b2118", border: `1px solid ${PAPER.accent}`, opacity: full ? 0.45 : 1, cursor: full ? "not-allowed" : "pointer" }}>
      <Plus size={15} /> New entry
    </button>
  );

  const subtitle = `${entries.length} / ${cap} entries · World: ${worldName}`;
  const emptyNote = <p style={{ fontSize: 12.5, color: PAPER.soft, padding: "18px 4px" }}>Nothing here yet.</p>;

  // ── mobile: one page, cover swings away over it ──────────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", background: PAPER.page, color: PAPER.ink, opacity: phase === "enter" || closing ? 0 : 1, transform: closing ? "scale(.97)" : "none", transition: "opacity 220ms, transform 220ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "calc(env(safe-area-inset-top, 0px) + 12px) 14px 8px" }}>
          <button onClick={requestClose} style={{ display: "flex", background: "transparent", border: "none", color: PAPER.ink, padding: 4 }}><ChevronLeft size={22} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: 20, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</h2>
            <p style={{ margin: 0, fontSize: 11.5, color: PAPER.soft }}>{subtitle}</p>
          </div>
        </div>
        <div style={{ padding: "4px 14px 8px" }}>{searchBox}</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          {category && (
            <button onClick={() => setCategory(null)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 0", background: "transparent", border: "none", color: PAPER.accent, fontSize: 12.5 }}>
              <ChevronLeft size={14} /> All categories
            </button>
          )}
          {category || q
            ? (listed.length ? listed.map(renderRow) : emptyNote)
            : loreTypes.map(renderCategory)}
        </div>
        <div style={{ padding: "10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px)", borderTop: `1px solid ${PAPER.rule}` }}>{newEntryBtn}</div>

        <LorebookCover cover={book.cover} title={book.title} style={{
          position: "absolute", inset: 0, aspectRatio: "auto", borderRadius: 0, pointerEvents: "none",
          transformOrigin: "left center", transform: opened ? "scaleX(0)" : "scaleX(1)",
          filter: opened ? "brightness(.6)" : "none",
          transition: phase === "open" ? "transform 480ms cubic-bezier(.5,0,.3,1), filter 480ms" : "none",
          display: phase === "done" ? "none" : undefined,
        }} />
      </div>
    );
  }

  // ── desktop: two-page spread ─────────────────────────────────────────────────
  const vw = window.innerWidth, vh = window.innerHeight;
  const s  = originRect ? originRect.height / H : 1;
  const T0 = originRect ? `translate(${originRect.left + originRect.width / 2 - vw / 2 - (s * P) / 2}px, ${originRect.top + originRect.height / 2 - vh / 2}px) scale(${s})` : "none";
  const T1 = `translate(${-P / 2}px, 0px) scale(1)`;       // closed, centred on screen
  const T2 = "translate(0px, 0px) scale(1)";               // open, centred
  const transform  = phase === "enter" ? T0 : phase === "expand" ? T1 : T2;
  const transition = phase === "expand" ? "transform 380ms cubic-bezier(.2,.8,.2,1)" : phase === "open" ? "transform 560ms cubic-bezier(.45,.05,.25,1)" : "none";
  const pageBase = { position: "absolute", top: 0, width: P, height: H, padding: "28px 30px", display: "flex", flexDirection: "column", color: PAPER.ink, overflow: "hidden" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", opacity: closing ? 0 : 1, transition: "opacity 200ms" }}>
      <div onClick={requestClose} style={{ position: "absolute", inset: 0, background: "rgba(8,6,4,.8)", opacity: phase === "enter" ? 0 : 1, transition: "opacity 300ms" }} />
      <button onClick={requestClose} title="Close" style={{ position: "absolute", top: 16, right: 16, display: "flex", padding: 8, border: "none", borderRadius: "50%", cursor: "pointer", color: "#e9dcc0", background: "rgba(255,255,255,.08)" }}><X size={18} /></button>

      <div style={{ position: "relative", width: 2 * P, height: H, transform, transition }}>
        <div style={{ position: "absolute", inset: -10, borderRadius: 10, background: "#1b130c", boxShadow: "0 30px 80px rgba(0,0,0,.7)", opacity: opened ? 1 : 0, transition: "opacity 300ms 200ms" }} />

        {/* left page — unfolds from the spine */}
        <div style={{ ...pageBase, left: 0, background: `linear-gradient(90deg, ${PAPER.page} 85%, #d9c9a6)`, borderRadius: "6px 0 0 6px", transformOrigin: "right center", transform: opened ? "scaleX(1)" : "scaleX(0)", transition: "transform 300ms cubic-bezier(.2,.7,.3,1) 260ms" }}>
          <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: 24, fontWeight: 600 }}>{book.title}</h2>
          <p style={{ margin: "4px 0 14px", fontSize: 12, color: PAPER.soft }}>{subtitle}</p>
          {searchBox}
          <div style={{ flex: 1, overflowY: "auto", margin: "10px 0" }}>{loreTypes.map(renderCategory)}</div>
          {newEntryBtn}
        </div>

        {/* right page */}
        <div style={{ ...pageBase, left: P, background: `linear-gradient(270deg, ${PAPER.page} 85%, #d9c9a6)`, borderRadius: "0 6px 6px 0" }}>
          <h3 style={{ margin: "0 0 8px", fontFamily: "Playfair Display", fontSize: 16, fontWeight: 600 }}>{heading}</h3>
          <div style={{ flex: 1, overflowY: "auto" }}>{listed.length ? listed.map(renderRow) : emptyNote}</div>
        </div>

        {/* cover — hinged on the spine, swings shut about its left edge */}
        <LorebookCover cover={book.cover} title={book.title} style={{
          position: "absolute", left: P, top: 0, width: P, height: H, aspectRatio: "auto", pointerEvents: "none",
          transformOrigin: "left center", transform: opened ? "scaleX(0)" : "scaleX(1)",
          filter: opened ? "brightness(.55)" : "none",
          transition: phase === "open" ? "transform 280ms cubic-bezier(.5,0,.8,.4), filter 280ms" : "none",
          display: phase === "done" ? "none" : undefined,
        }} />
      </div>
    </div>
  );
}