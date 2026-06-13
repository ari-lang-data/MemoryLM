# Phase 1
- Basic JSX frontend; no backend
- Memories and lorebook entries retrieved through simple cosine similarity
- Chats, memories, lorebook entries, etc. live in localStorage
- No chat history
- Single-chat interface

# Phase 2
- React + Vite frontend; no backend
- Embedding via MiniLM-L6-v2
- Still single-chat interface
- No persistent chat history
- Memories and lorebook entries retrieved through simple cosine similarity
- Chats, memories, lorebook entries, etc. live in localStorage

# Phase 3
- React + Vite frontend, FastAPI backend
- Embedding via MiniLM-L6-v2
- Memories and lorebook entries retrieved through ChromaDB HNSW
- Chats live in localStorage
- Memories and lorebook entries live in SQLite database
- Still single-chat interface
- No persistent chat history

> ***Note**: Phases 1‒3 are ot available in GitHub commit history*

# Phase 4
- React + Vite frontend, FastAPI backend
- Memories and lorebook entries retrieved through ChromaDB HNSW
- Chats live in JSON files in the backend
- Memories and lorebook entries live in SQLite database
- Chat history supported
- Multi-chat interface
- Chat tab
- Chat titles are LLM generated
- Memories are chat-specific
- Lorebook is globally available
- Added LLM presets
- Markdown rendering for chats, with syntax highlighting

# Phase 5
- Everything in Phase 4
- Recency ranking added
- Preset style metric added
- Narrative continuation added (to combat stopping due to context limit getting exhausted, and to continue a narrative without user input)
- Streaming LLM response
- LaTeX rendering through KaTeX added
- Chats moved to a sidebar
- Renaming chats is possible via double-click
- Injection panel (for most recent assistant message) to show injected context
- Re-embedded lorebook via title and tags only

# Phase 6
- Everything in Phase 5
- Regeneration behaviour changed from replacement to inline branching (can be altered per-preset)
- Fork to new chat
- Node-based message tree
- Contextual retrieval modes
- Importance heuristics
- Settings panel restructured into tabbed interface

# Phase 7
- Everything in Phase 6
- Added entity graphs, creation and traversal via DuckDB―SQLite implemented as fallback
- Added Characters tab to have character personas in Roleplay settings
- Added graph visualisation via fore-directed HTML5 simulation
- Compressed presets to 4 configurable ones: Assistant, Coding, Creative, and Roleplay
- Roleplay uses template variables {$char} and {$usr} for model and user personas
- Added a context window slider to dictate history sent to LLM when generating a response

# Phase 8
- Added episodic memory
- Added fact and inference separation
- Added preferred aliases to character definitions to prevent the model from using full names in every reference
- Changed all confirmations to modals instead of browser prompt
- Compressed Preset and Settings tabs into one modal and sent it to a ⛭ icon in the chat sidebar footer
- Implemented Fermi-Dirac function to dictate background blurring and dimming in modals and for frosted glass effect
- Turned chat sidebar and injection panels into frosted glass panels
- Added themes (Dark, Light, Sepia, and Midnight)
- Added a preview group chat feature (buggy, not recommeneded to try)
