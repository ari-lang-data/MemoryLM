# MemoryLM

A persistent memory architecture for local LLMs, with first-class support for LM Studio servers.

## The Problem

Local LLMs have no memory beyond their context window. This is a significant limitation for long-form work — extended coding sessions, novel writing, roleplay, or any conversation where continuity matters. Memory systems for Ollama exist, but equivalent tooling for LM Studio's OpenAI-compatible server is largely absent.

## How It Works

Rather than keeping memory inside the context window, MemoryLM stores it externally. Every few turns, the LLM summarises the conversation into a compact memory entry, which is embedded and stored in a ChromaDB vector database. On each new message, the most semantically relevant memories are retrieved and injected into the system prompt — then removed after the response, keeping the context window free.

The same pipeline serves a **Lorebook** — a structured knowledge base of characters, locations, factions, and world rules for novelistic or roleplay-style sessions. Lorebook entries are retrieved by the same vector similarity search and injected alongside memories as needed.

## Features

- 🧠 Automatic memory summarisation and storage
- 🔍 Semantic retrieval via ChromaDB (HNSW + cosine similarity)
- 📖 Lorebook with typed entries (character, location, faction, item, event, rule)
- 🎭 Persona presets — bundled system prompts + memory parameters per use case
- 💬 Multi-chat support with persistent message history
- 🔁 Memory deduplication (merge or discard near-duplicate memories)
- 🌊 Token streaming — responses stream in real time rather than waiting for full completion
- 📐 LaTeX rendering via KaTeX — inline and block math expressions rendered natively
- 🕐 Recency-weighted retrieval — memories ranked by combined semantic similarity and recency, configurable per preset
- ⏩ Narrative continuation — creative and roleplay presets expose a continuation button when input is empty, sending an implicit prompt to advance the story without cluttering the chat
- 💬 Chat sidebar — slide-in panel for chat management with inline rename and delete
- 🔍 Injection inspector — hover over the "N mem · N lore injected" line on any response to see exactly what context was retrieved, with memory scores and lorebook type indicators
- 🧠 Reasoning parsing — infrastructure for stripping and displaying model reasoning traces when exposed by the inference server
- 🌿 Branching — fork any message to explore an alternative direction, or use regenerate to create an inline branch; branches are navigable without leaving the chat
- 🕸️ Entity graph — on-demand extraction builds a force-directed knowledge graph of characters, locations, and relationships, with graph-aware retrieval to surface contextually connected memories
- 🎭 Character tab — roleplay presets support avatar images and character sheets; the character panel is scoped to roleplay mode while creative mode uses the research extraction pipeline
- 📌 Pinning — individual memories and lorebook entries can be pinned to guarantee injection regardless of retrieval score
- 🎯 Contextual retrieval — a heuristic classifier selects the retrieval mode (semantic, recency, hybrid, graph-traversal) based on the nature of each message
- ⚖️ Importance heuristics + semantic clustering — memories are scored for importance at write time and clustered to reduce redundancy
- 🔧 Template variables — system prompts support interpolated variables resolved at injection time
- 🧩 Episodic inference — inferred narrative and technical states stored separately from memories; active states injected with confidence scores and maintained until contradictory evidence triggers resolution
- 📋 Facts — discrete facts extracted from episodic memories stored in a dedicated table, distinct from inferences and summaries
- 🎭 Preferred reference forms — characters carry narrative alias, formal address, and informal address fields; injected explicitly into the system prompt so local models refer to characters naturally rather than by full name
- ⚙️ Combined Settings & Presets modal — gear icon in the chat sidebar footer opens a unified modal; presets and settings consolidated into a single interface
- 🎨 Themes — Light, Dark, Sepia (warm library aesthetic), and Midnight (deep navy); switchable from Settings
- ⌨️ Keyboard shortcuts — navigation, chat, graph, and character shortcuts throughout; F1 opens a reference modal
- 🪟 Frosted glass panels — chat sidebar and injection panel use theme-aware frosted glass backgrounds computed via Fermi-Dirac function
- 🔔 Confirmation modals — all destructive actions use a reusable modal rather than browser confirm dialogs
- 🃏 Graph node hover cards — hovering a node in roleplay mode shows the character or lorebook card with avatar, fields, and reference forms
- 💬 Group chat preview (experimental) — roleplay mode supports multi-character sessions; an evaluator routes responses between characters based on direct address or narrative context; currently unstable, full redesign planned for Phase 9
- 🔗 Character-chat binding — the model's active character is bound to a chat on first message; restores automatically on chat switch and page reload, preventing cross-chat persona bleed
- 📦 Full data export — export all chats, memories, lorebook entries, characters, and entity graphs as a single JSON package
- ⚙️ Fully local — no cloud APIs, no telemetry

## Stack

**Frontend:** React + Vite, `@xenova/transformers` (in-browser embeddings via MiniLM-L6-v2), `react-markdown`, `remark-math`, `rehype-katex`, `react-syntax-highlighter`

**Backend:** FastAPI + ChromaDB + SQLite + DuckDB (entity graph, SQLite fallback) + JSON message storage

## Setup

### Backend
```bash
python3 -m venv venv
# Linux/macOS
source venv/bin/activate

#Windows
venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. In Settings, set your LM Studio server URL (default `http://localhost:1234`) and make sure CORS is enabled in LM Studio.

## Architecture

| Data | Storage |
|------|---------|
| Chat metadata | SQLite |
| Messages | JSON files (per chat) |
| Memories | ChromaDB |
| Lorebook | ChromaDB |
| Presets | SQLite |
| UI state | localStorage |
| Entity graph | DuckDB (SQLite fallback) |
| Episodic inferences + facts | SQLite |

## Preset Styles

Each persona preset carries a `style` field that affects chat behaviour:

| Style | Continuation button | Notes |
|-------|-------------------|-------|
| `none` | Never shown | Standard assistant behaviour |
| `creative` | Always shown when chat non-empty | Sends configurable continuation prompt |
| `roleplay` | Always shown when chat non-empty | Same as creative, distinct for future differentiation |
| `technical` | Shown only on token limit reached | Helps continue truncated responses |

Recency ranking is also configurable per preset via `alpha` (similarity weight) and `decayRate` (hourly decay).

## Requirements

- Node.js 20+ and Python 3.10+
- LM Studio with a model loaded and local server running
- Internet connection on first launch — downloads the MiniLM-L6-v2 embedding model (~25MB) from Hugging Face via CDN, cached by the browser after first use. Subsequent sessions work offline.

## Keyboard Shortcuts
Press `F1` for shortcuts modal.
Current shortcuts include:
### Navigation
- Chats tab: Ctrl + 1
- Memories tab: Ctrl + 2
- Lorebook tab: Ctrl + 3
- Graph tab: Ctrl + 6
- Characters tab: Ctrl + 7
### Search
- Global search: Ctrl + K (pending implementation, resolution in phase 9)
- Command palette: Ctrl + P (pending implementation, resolution in phase 9)
### Chat
- Send message: Enter
- New line: Shift + Enter
- Regenerate: Ctrl + Shift + Enter
- Continue: Ctrl + Shift + F
### Characters
- New character: N
- Edit selected: E
- Delete selected: Del
### Graph
- Reset view: R
- Fit graph: F
- Show all: A
- Concepts only: C
- Characters only: H
### General
- Settings: Ctrl + ,
- Keyboard shortcuts: F1
- Close modal: Esc

## Credits

Built in collaboration with [Claude](https://claude.ai) (Anthropic).
