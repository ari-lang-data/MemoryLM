import { useState, useEffect } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";
import { worldsAPI } from "../lib/api";
import { ChevronDown, ChevronRight, X } from "lucide-react";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();
const inputStyle = {
  padding: "6px 10px", borderRadius: "var(--border-radius-md)",
  border: "0.5px solid var(--color-border-tertiary)",
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)", fontSize: 13,
  fontFamily: "var(--font-sans)",
};

export default function WorldCreatorModal({ activePresetId, characters, onClose }) {
  const [worlds,       setWorlds]       = useState([]);
  const [view,         setView]         = useState("list"); // "list" | "edit"
  const [draft,        setDraft]        = useState({ name: "", blurb: "", llm_context: "" });
  const [linkedChars,  setLinkedChars]  = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [calendar,     setCalendar]     = useState({
    minutes_per_day: 1440, epoch_label: new Date().getFullYear(),
    month_names: "Month 1,Month 2,Month 3,Month 4,Month 5,Month 6,Month 7,Month 8,Month 9,Month 10,Month 11,Month 12",
    days_per_month: "30,30,30,30,30,30,30,30,30,30,30,30",
  });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const w = await worldsAPI.getAll(activePresetId).catch(() => []);
    setWorlds(w ?? []);
  }

  function openNew() {
    setDraft({ name: "", blurb: "", llm_context: "" });
    setLinkedChars([]);
    setView("edit");
  }

  async function saveWorld() {
    if (!draft.name.trim()) return;
    const calendar_config = {
      minutes_per_day: calendar.minutes_per_day,
      epoch_label:      calendar.epoch_label,
      month_names:      calendar.month_names.split(",").map(s => s.trim()),
      days_per_month:   calendar.days_per_month.split(",").map(s => parseInt(s.trim(), 10)),
      day_names:        ["Day1","Day2","Day3","Day4","Day5","Day6","Day7"],
      dawn_offset: 360, morning_offset: 480, evening_offset: 1080, night_offset: 1320,
    };
    const world = await worldsAPI.create({
      name: draft.name, blurb: draft.blurb, llm_context: draft.llm_context,
      preset_id: activePresetId, calendar_config,
    });
    await Promise.all(linkedChars.map(cid => worldsAPI.linkCharacter(world.id, cid)));
    setView("list");
    refresh();
  }

  function toggleChar(id) {
    setLinkedChars(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: `rgba(0,0,0,${backdropOpacity})`, backdropFilter: `blur(${backdropBlur}px)`, WebkitBackdropFilter: `blur(${backdropBlur}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", width: "min(520px, 92vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Worlds</p>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18 }}><X size={15}/> </button>
        </div>

        {view === "list" && (
          <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={openNew} style={{ ...inputStyle, cursor: "pointer", alignSelf: "flex-start" }}>+ New world</button>
            {worlds.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 24 }}>No worlds yet.</p>}
            {worlds.map(w => (
              <div key={w.id} style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{w.name}</p>
                {w.blurb && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{w.blurb}</p>}
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{w.formatted_time}</span>
              </div>
            ))}
          </div>
        )}

        {view === "edit" && (
          <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="World name" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Description <span style={{ opacity: 0.6 }}>(shown when choosing a world)</span></p>
              <textarea value={draft.blurb} onChange={e => setDraft(d => ({ ...d, blurb: e.target.value }))} placeholder="A brief, evocative description…" style={{ ...inputStyle, width: "100%", minHeight: 50, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Scene setting <span style={{ opacity: 0.6 }}>(sent to the model — no time-dependent detail)</span></p>
              <textarea value={draft.llm_context} onChange={e => setDraft(d => ({ ...d, llm_context: e.target.value }))} placeholder="Tone, geography, factions, ambient rules of this world…" style={{ ...inputStyle, width: "100%", minHeight: 90, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--color-text-secondary)" }}>Link characters</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {characters.map(c => (
                  <button key={c.id} onClick={() => toggleChar(c.id)} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, borderColor: linkedChars.includes(c.id) ? "var(--color-border-primary)" : undefined, background: linkedChars.includes(c.id) ? "var(--color-background-tertiary)" : "var(--color-bubble-user)" }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setAdvancedOpen(o => !o)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 12, padding: "4px 0", textAlign: "left" }}>
              {advancedOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} Advanced calendar
            </button>
            {advancedOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Epoch <span style={{ opacity: 0.6 }}>(Year, period, etc.)</span></p>
                <input value={calendar.epoch_label} onChange={e => setCalendar(c => ({ ...c, epoch_label: e.target.value }))} placeholder="Epoch label (e.g. Year 1)" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Minutes per day</p>
                <input type="number" value={calendar.minutes_per_day} onChange={e => setCalendar(c => ({ ...c, minutes_per_day: parseInt(e.target.value, 10) || 1440 }))} placeholder="Minutes per day" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Month names</p>
                <input value={calendar.month_names} onChange={e => setCalendar(c => ({ ...c, month_names: e.target.value }))} placeholder="Month names, comma-separated" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Number of days per month</p>
                <input value={calendar.days_per_month} onChange={e => setCalendar(c => ({ ...c, days_per_month: e.target.value }))} placeholder="Days per month, comma-separated" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveWorld} disabled={!draft.name.trim()} style={{ ...inputStyle, cursor: "pointer", opacity: !draft.name.trim() ? 0.4 : 1 }}>Create</button>
              <button onClick={() => setView("list")} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}