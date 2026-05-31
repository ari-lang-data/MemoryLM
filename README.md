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
- ⚙️ Fully local — no cloud APIs, no telemetry

## Stack

**Frontend:** React + Vite, `@xenova/transformers` (in-browser embeddings via MiniLM-L6-v2), `react-markdown`, `remark-math`, `rehype-katex`, `react-syntax-highlighter`

**Backend:** FastAPI + ChromaDB + SQLite + JSON message storage

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

## Credits

Built in collaboration with [Claude](https://claude.ai) (Anthropic).
