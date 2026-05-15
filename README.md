# Project2MindMap

A local-first research knowledge management application for academics and researchers. It turns a structured SQLite database of nodes, edges, sources, and annotations into an interactive visual workspace, letting you browse your research graph, read individual nodes in depth, track momentum across experiments and writing projects, and review AI-generated ingestion candidates before committing them to the knowledge base.

No cloud. No account. Everything runs on your machine and reads directly from a `.db` file in the project folder.

---

## What it does

Your research is modelled as a **graph of nodes** (papers, models, experiments, datasets, open questions, grants, etc.) connected by typed **edges** (uses, evaluates, supports, contradicts, and related links). Project2MindMap gives you six views into that graph:

| View | Purpose |
|---|---|
| **Momentum** | Temporal dashboard with activity heatmap, change stream, active experiments with progress, and attention cards for pending ingestion jobs |
| **Overview** | Hierarchical tree browser; filter by category, status, or importance; click any node to open it in Focus |
| **Focus** | Full-page editorial reading view with breadcrumb navigation, detail blocks, connections, sources, and open questions for a single node |
| **Atlas** | Force-directed graph explorer with cluster, force, and radial layout modes; Knowledge, Workflow, and Risk lens presets; category and relation toggles |
| **Outline** | Writing editor for Grant, Paper, and Writing nodes with section-by-section editing, inline `@[node]` evidence citations, and suggested citations |
| **Review Studio** | Ingestion candidate review; approve, reject, or flag node, edge, and detail candidates produced by an LLM pipeline, then commit or reject the job |

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
| GET | `/api/projects/{id}/export/{format}` | Export as JSON, Markdown, Mermaid, CSV zip, or Obsidian zip |
| POST | `/api/projects/{id}/ingestion/jobs` | Submit a canonical ingestion payload |
| GET | `/api/ingestion/jobs/{job_id}` | Fetch ingestion job metadata |
| GET | `/api/ingestion/jobs/{job_id}/candidates` | Fetch candidates for a job |
| PATCH | `/api/ingestion/candidates/{type}/{id}` | Update review status of a node / edge / detail candidate |
| POST | `/api/ingestion/jobs/{job_id}/commit` | Commit all approved candidates to the graph |
| POST | `/api/ingestion/jobs/{job_id}/reject` | Reject and discard a job |
| POST | `/api/databases/switch` | Switch the active database at runtime |

---

## Ingestion pipeline

Project2MindMap supports an **LLM ingestion loop**: an external pipeline (e.g. an LLM processing a paper, meeting note, or chat log) posts a canonical JSON payload to `/api/projects/{id}/ingestion/jobs`. The payload describes proposed nodes, edges, and detail blocks.

The **Review Studio** view lets a human:
1. Read the raw source note alongside the proposed candidates
2. Approve, reject, or flag each candidate for review
3. Commit the approved set; the backend writes them to the graph in one atomic transaction

The `llm_wiki` database profile restricts ingestion commits to preserve read-only wiki integrity.

---

## Outline citation format

In the Outline editor, you can cite other nodes inline using the token syntax:

```
@[nodeId|Display Text|category]
```

Example:

```
This approach builds on @[ct_clip|CT-CLIP|Model] and was validated
against @[chexbert|CheXBert|Model] as a baseline.
```

Tokens are stored verbatim in the `detail_blocks.content` column. The editor renders them as coloured chips and the Evidence Sidebar automatically surfaces uncited but related nodes as suggestions.

See [`docs/outline_doc_format.md`](docs/outline_doc_format.md) for the full specification.

---

## Tests

**Backend (18 tests):**
```powershell
cd backend
python -m pytest
```

Covers: API health, metadata, tree, graph, dashboard, node detail, search, exports, direct editing, database switching, ingestion create/commit/reject, llm\_wiki read-only guardrails, and seed validation.

**Frontend (9 tests):**
```powershell
cd frontend
npm.cmd run test -- --run
```

Covers: app render with mocked API, Review Studio reducer (approve all → commit → navigate), and Outline `parseChips` serialisation helpers + EvidenceChip render.

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
│   │   └── views/                # Atlas, Focus, Momentum, Outline, ReviewStudio
│   └── index.html
├── docs/
│   ├── manual_acceptance.md      # Feature acceptance runbook
│   └── outline_doc_format.md     # @[...] citation format spec
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
| g then o | Go to Outline |
| g then r | Go to Review Studio |
| g then e | Go to Export |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
