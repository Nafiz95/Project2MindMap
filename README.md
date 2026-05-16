<p align="center">
  <img src="projec2mindmapLogo.png" alt="Project2MindMap" width="320" />
</p>

A local-first research knowledge management application for academics and researchers. It turns a structured SQLite database of nodes, edges, sources, and annotations into an interactive visual workspace, letting you browse your research graph, read individual nodes in depth, and track momentum across experiments and writing projects.

No cloud. No account. Everything runs on your machine and reads directly from a `.db` file in the project folder.

---

## What it does

Your research is modelled as a **graph of nodes** (papers, models, experiments, datasets, open questions, grants, etc.) connected by typed **edges** (uses, evaluates, supports, contradicts, and related links). Project2MindMap gives you four views into that graph:

| View | Purpose |
|---|---|
| **Momentum** | Temporal dashboard with activity heatmap, change stream, active experiments with progress, and attention cards for open questions |
| **Overview** | Hierarchical tree browser; filter by category, status, or importance; click any node to open it in Focus |
| **Focus** | Full-page editorial reading view with breadcrumb navigation, detail blocks, connections, sources, and open questions for a single node |
| **Atlas** | Force-directed graph explorer with cluster, force, and radial layout modes; Knowledge, Workflow, and Risk lens presets; category and relation toggles |

A global **Spotlight** palette (Cmd+K / Ctrl+K) lets you jump to any node or trigger actions from anywhere in the app.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy, SQLite |
| Frontend | React, TypeScript, Vite |
| Graph layout | d3-force, d3-zoom, d3-selection |
| Typography | Newsreader (serif), Inter (sans), JetBrains Mono |
| Tests | pytest (backend), Vitest + Testing Library (frontend) |

---

## Requirements

- Python 3.12+
- Node.js 18+ and npm

> **Windows note:** If `npm` is blocked by PowerShell execution policy, use `npm.cmd` instead throughout.

---

## Quick start

### 1 - Install dependencies

```powershell
# Backend
cd backend
pip install -e .

# Frontend
cd ..\frontend
npm.cmd install
```

### 2 - Build the frontend

```powershell
npm.cmd run build
```

### 3 - Start the server

```powershell
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 4 - Open the app

```
http://127.0.0.1:8000
```

The backend serves the compiled frontend at the root and exposes the REST API under `/api`.

---

## Development mode (live reload)

Run the backend and frontend in two separate terminals.

**Terminal 1 - backend:**
```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - frontend:**
```powershell
cd frontend
npm.cmd run dev
```

Open `http://localhost:5173`. Vite proxies all `/api` requests to the backend at port 8000.

---

## Utility scripts

```powershell
.\scripts\start.ps1        # build frontend + start backend in one step
.\scripts\build-ui.ps1     # rebuild frontend only
.\scripts\check-runtime.ps1 # verify the running server reports expected metadata
```

---

## Database

The app reads from a SQLite file placed in the project root. Two database profiles are supported:

| Profile | File | Description |
|---|---|---|
| `llm_wiki` | `llm_wiki.db` | LLM-native wiki graph; read-only profile |
| `legacy_mindmap` | `project2mindmap.db` | Original mind-map schema; full read/write |

The backend auto-selects `llm_wiki.db` when present and populated, otherwise falls back to `project2mindmap.db`.

To force a specific database:

```powershell
$env:PROJECT2MINDMAP_DB = "project2mindmap.db"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

You can also switch databases at runtime from the **Database** tab in the UI without restarting the server.

### Reference files

| File | Purpose |
|---|---|
| `project2mindmap_schema.sql` | Canonical schema definition |
| `project2mindmap_seed.json` | Example seed data for development |
| `project2mindmap_seed.db` | Pre-seeded SQLite file for local testing |

---

## REST API

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/metadata` | Runtime info, database profile, node/edge counts |
| GET | `/api/projects/{id}/tree` | Full node hierarchy |
| GET | `/api/projects/{id}/graph` | Nodes and edges for graph views |
| GET | `/api/projects/{id}/dashboard` | Counts, active experiments, open questions, writing |
| GET | `/api/projects/{id}/nodes/{node_id}` | Full node detail with blocks, edges, sources, tags |
| GET | `/api/projects/{id}/search?q=...` | Full-text search across nodes, details, tags, sources |
| GET | `/api/projects/{id}/activity` | Recent activity stream (used by Momentum) |
| POST | `/api/databases/switch` | Switch the active database at runtime |

---

## Tests

**Backend (18 tests):**
```powershell
cd backend
python -m pytest
```

Covers: API health, metadata, tree, graph, dashboard, node detail, search, direct editing, database switching, ingestion create/commit/reject, llm\_wiki read-only guardrails, and seed validation.

**Frontend (3 tests):**
```powershell
cd frontend
npm.cmd run test -- --run
```

Covers: app render with mocked API (logo present, project tree loaded).

---

## Project structure

```
Project2MindMap/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app factory
│   │   ├── routes/               # projects, ingestion, export, databases
│   │   ├── services/             # query, ingestion, database profile logic
│   │   ├── schemas.py            # Pydantic request/response models
│   │   └── database.py           # SQLAlchemy session
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Root: routing, state, nav
│   │   ├── api/client.ts         # Typed API client
│   │   ├── types.ts              # Shared TypeScript types
│   │   ├── styles/               # tokens.css, catTokens.ts
│   │   ├── components/           # Spotlight, primitives (CatPill, StatusDot, …)
│   │   └── views/                # Atlas, Focus, Momentum, Overview
│   └── index.html
├── docs/
│   └── manual_acceptance.md      # Feature acceptance runbook
├── scripts/                      # PowerShell dev helpers
├── llm_wiki.db                   # Active database (not committed to VCS)
└── project2mindmap_schema.sql    # Schema reference
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Cmd+K / Ctrl+K | Open Spotlight |
| ? | Open Spotlight |
| Esc | Close Spotlight / overlay |
| g then a | Go to Atlas |
| g then f | Go to Focus |
| g then m | Go to Momentum |

---

## Creating and updating `llm_wiki.db`

The `llm_wiki.db` file is the core database used by the app. It is generated and maintained through the LLM wiki prompt workflow:

1. For the first session of a project, use [`LLM_Wiki_InitPrompt.txt`](LLM_Wiki_InitPrompt.txt). This prompt is intended to create the initial `llm_wiki.db` file.
2. For later sessions, use [`LLM_Wiki_UpdatePrompt.txt`](LLM_Wiki_UpdatePrompt.txt) and provide the existing `llm_wiki.db` file to the LLM session. The update workflow should modify the existing database instead of creating a separate replacement.
3. Place the resulting `llm_wiki.db` in the repository root before starting the app. On startup, the backend automatically prefers a valid populated `llm_wiki.db`.

Local database files are intentionally ignored by Git, so each user can maintain their own research database without committing private data.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
