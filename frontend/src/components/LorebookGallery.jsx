import { useMemo, useState } from "react";
import { Search, Trash2, Shuffle } from "lucide-react";
import { randomCover } from "../lib/lorebookCover";
import { inputStyle } from "../lib/constants";
import LorebookCover from "./LorebookCover";
import BookPenIcon from "./icons/BookPenIcon";

export default function LorebookGallery({ lorebooks, worlds, entryCounts, onOpen, onCreate, onDelete, confirm }) {
    const [query, setQuery] = useState("");
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [worldId, setWorldId] = useState("");
    const [cover, setCover] = useState(() => randomCover());

    const worldName = id => worlds.find(w => w.id === id)?.name ?? "Original";
    const shown = useMemo(
        () => lorebooks.filter(b => b.title.toLowerCase().includes(query.trim().toLowerCase())),
        [lorebooks, query]
    );

    function startCreate() { setTitle(""); setWorldId(""); setCover(randomCover()); setCreating(true); }
    async function submit() {
        if (!title.trim()) return;
        await onCreate({ title: title.trim(), cover, world_id: worldId || null });
        setCreating(false);
    }

    return (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
            <div>
            <h1 style={{ margin: 0, fontFamily: "Playfair Display", fontWeight: 600, fontSize: 28 }}>Lorebooks</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Select a lorebook to view and manage its entries.</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--color-text-tertiary)" }} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lorebooks…" style={{ ...inputStyle, paddingLeft: 30, width: 220 }} />
            </div>
            <button onClick={startCreate} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-rim-accent-2)", color: "var(--color-text-primary)" }}>
                <BookPenIcon size={17} /> New Lorebook
            </button>
            </div>
        </div>

        {shown.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-tertiary)", padding: 40 }}>
            {lorebooks.length === 0 ? "No lorebooks yet — create one to start collecting lore." : "No lorebooks match that search."}
            </p>
        ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "26px 20px" }}>
            {shown.map(b => {
                const n = entryCounts[b.id] ?? 0;
                return (
                <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <LorebookCover
                    cover={b.cover} title={b.title}
                    role="button" tabIndex={0}
                    onClick={e => onOpen(b, e.currentTarget.getBoundingClientRect())}
                    onKeyDown={e => { if (e.key === "Enter") onOpen(b, e.currentTarget.getBoundingClientRect()); }}
                    style={{ cursor: "pointer" }}
                    >
                    <button
                        title="Delete lorebook"
                        onClick={async e => {
                        e.stopPropagation();
                        if (await confirm(`Delete “${b.title}” and its ${n} ${n === 1 ? "entry" : "entries"}?`)) onDelete(b);
                        }}
                        style={{ position: "absolute", right: 8, bottom: 8, display: "flex", padding: 5, border: "none", borderRadius: 6, cursor: "pointer", color: "rgba(233,201,127,.8)", background: "rgba(0,0,0,.3)" }}
                    ><Trash2 size={14} /></button>
                    </LorebookCover>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--color-text-secondary)" }}>
                    {n} {n === 1 ? "entry" : "entries"}<br />
                    <span style={{ color: "var(--color-text-tertiary)" }}>World: {worldName(b.world_id)}</span>
                    </div>
                </div>
                );
            })}
            </div>
        )}

        {creating && (
            <div onClick={() => setCreating(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "min(520px, 100%)", display: "flex", gap: 20, flexWrap: "wrap", padding: 20, borderRadius: "var(--border-radius-lg)", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-primary)" }}>
                <div style={{ width: 150, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <LorebookCover cover={cover} title={title || "Untitled"} />
                <button onClick={() => setCover(randomCover())} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Shuffle size={13} /> Shuffle cover
                </button>
                </div>
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>New lorebook</p>
                <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); }} placeholder="Title" style={inputStyle} />
                <select value={worldId} onChange={e => setWorldId(e.target.value)} style={inputStyle}>
                    <option value="">World: Original</option>
                    {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <button onClick={submit} disabled={!title.trim()} style={{ ...inputStyle, flex: 1, cursor: "pointer", opacity: title.trim() ? 1 : 0.4 }}>Create</button>
                    <button onClick={() => setCreating(false)} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>
                </div>
                </div>
            </div>
            </div>
        )}
        </div>
    );

}