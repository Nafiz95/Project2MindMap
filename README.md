# Project2MindMap

Project2MindMap is a local-first research knowledge-map application for exploring SQLite-backed project databases. It provides a FastAPI backend and a React/Vite frontend for browsing project trees, graph relationships, dashboard summaries, database metadata, search results, and exports.

## Features

- SQLite-backed project loading.
- Tree, graph, dashboard, database, search, and export views.
- Support for the `llm_wiki` database profile and a legacy mind-map database profile.
- Exports for JSON, Markdown, Mermaid, CSV zip, and Obsidian zip.
- Local runtime with no external service dependency.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: React, TypeScript, Vite
- Tests: pytest, Vitest

## Requirements

- Python 3.12+
- Node.js and npm

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by script execution policy.

## Running The Application

Build the frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
```

Start the backend:

```powershell
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open the application:

```text
http://127.0.0.1:8000
```

The API is served under `/api`, for example:

```text
http://127.0.0.1:8000/api/metadata
```

## Frontend Development

For frontend development with Vite live reload, run the backend and frontend in separate terminals.

Backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Vite proxies `/api` requests to the FastAPI backend at `http://127.0.0.1:8000`.

## Data

The application reads from an active SQLite database in the repository workspace.

- Preferred runtime database: `llm_wiki.db`
- Legacy runtime database: `project2mindmap.db`
- Optional seed/import source: `project2mindmap_seed.json`
- Schema reference: `project2mindmap_schema.sql`

By default, the backend selects a valid populated `llm_wiki.db` when present. Otherwise, it falls back to `project2mindmap.db`.

To select a database explicitly:

```powershell
$env:PROJECT2MINDMAP_DB="llm_wiki.db"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Tests

Backend:

```powershell
cd backend
python -m pytest
```

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd test -- --run
```

## Utility Scripts

The `scripts/` directory contains optional PowerShell helpers for local development:

```powershell
.\scripts\start.ps1
.\scripts\check-runtime.ps1
.\scripts\build-ui.ps1
```

These scripts are convenience wrappers around the manual commands above.
