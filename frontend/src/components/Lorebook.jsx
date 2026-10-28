import { useEffect, useMemo, useState } from "react";
import { worldsAPI } from "../lib/api";
import LorebookGallery from "./LorebookGallery";
import LorebookBook from "./LorebookBook";
import LorebookPanel from "./LorebookPanel";

export default function Lorebook({
  lorebook, lorebooks, onCreateBook, onDeleteBook, confirm,
  lorebookDraft, editingLore, setEditingLore, TYPE_COLORS, LORE_TYPES, setLorebookDraft,
  addLorebookEntry, deleteLorebookEntry, toggleLorePin, onOpenEdges,
  loreEdgePanel, setLoreEdgePanel, entities, graphAPI,
}) {
  const [open, setOpen]           = useState(null);   // { id, rect }
  const [panelOpen, setPanelOpen] = useState(false);
  const [worlds, setWorlds]       = useState([]);

  useEffect(() => { worldsAPI.getAll().then(w => setWorlds(w ?? [])).catch(() => setWorlds([])); }, []);

  const book = open ? lorebooks.find(b => b.id === open.id) : null;
  const entries = useMemo(() => lorebook.filter(e => e.lorebook_id === open?.id), [lorebook, open?.id]);
  const entryCounts = useMemo(() => {
    const c = {};
    lorebook.forEach(e => { if (e.lorebook_id) c[e.lorebook_id] = (c[e.lorebook_id] ?? 0) + 1; });
    return c;
  }, [lorebook]);

  function newEntry() {
    setEditingLore(null);
    setLorebookDraft({ title: "", tags: "", content: "", type: "character" });
    setLoreEdgePanel(null);
    setPanelOpen(true);
  }
  function openEntry(e) {
    setEditingLore(e.id);
    setLorebookDraft({ title: e.title, tags: e.tags ?? "", content: e.content, type: e.type ?? "character" });
    setLoreEdgePanel(null);
    setPanelOpen(true);
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", overflow: "hidden", width: "100%" }}>
      <LorebookGallery
        lorebooks={lorebooks} worlds={worlds} entryCounts={entryCounts}
        onOpen={(b, rect) => setOpen({ id: b.id, rect })}
        onCreate={onCreateBook} onDelete={onDeleteBook} confirm={confirm}
      />
      {book && (
        <LorebookBook
          key={book.id} book={book}
          worldName={worlds.find(w => w.id === book.world_id)?.name ?? "Original"}
          originRect={open.rect} entries={entries}
          typeColors={TYPE_COLORS} loreTypes={LORE_TYPES}
          onClose={() => { setPanelOpen(false); setOpen(null); }}
          onNewEntry={newEntry} onOpenEntry={openEntry} escapeEnabled={!panelOpen}
        />
      )}
      <LorebookPanel
        open={panelOpen && !!book} onClose={() => setPanelOpen(false)} bookId={book?.id}
        lorebook={lorebook} lorebookDraft={lorebookDraft} setLorebookDraft={setLorebookDraft}
        editingLore={editingLore} setEditingLore={setEditingLore}
        addLorebookEntry={addLorebookEntry} deleteLorebookEntry={deleteLorebookEntry}
        toggleLorePin={toggleLorePin} onOpenEdges={onOpenEdges}
        LORE_TYPES={LORE_TYPES} loreEdgePanel={loreEdgePanel} setLoreEdgePanel={setLoreEdgePanel}
        entities={entities} graphAPI={graphAPI} confirm={confirm}
      />
    </div>
  );
}