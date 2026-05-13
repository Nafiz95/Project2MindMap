# Project2MindMap

Local-first research knowledge-map app for the VLM Radiology Research Program.

## Normal Startup

Use the one-port app for normal usage:

```powershell
.\scripts\start.ps1
```

Open `http://127.0.0.1:8000`.

The script builds the React UI if needed, starts FastAPI, and serves both the UI and API from port `8000`. The API is under `/api`, for example `http://127.0.0.1:8000/api/metadata`.

To inspect the running backend:

```powershell
.\scripts\check-runtime.ps1
```

If port `8000` is already occupied by an old or incompatible backend, the script fails clearly instead of starting another server on a different port.

## Frontend Development

Use Vite only when actively editing the frontend:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. Vite proxies relative `/api` calls to `http://127.0.0.1:8000/api`, so no manual API base URL is needed.

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown above.

## Useful Checks

```powershell
cd backend
python -m pytest
```

Developer-only legacy DB rebuild commands:

```powershell
cd backend
python -m app.cli.manage validate-seed --input ..\project2mindmap_seed.json
python -m app.cli.manage init-db --drop-existing
python -m app.cli.manage seed --input ..\project2mindmap_seed.json
```

Frontend checks:

```powershell
cd frontend
npm.cmd run build
npm.cmd test -- --run
```

## MVP Scope

Implemented MVP surfaces:

- SQLite-backed project loading with native `llm_wiki.db` support and legacy mind-map DB compatibility.
- FastAPI read APIs for project tree, node detail, search, and exports.
- React tree, graph, dashboard, database-source, search/filter, and export UI.
- Structured JSON ingestion and candidate review for legacy-schema databases.
- Read/display-first `llm_wiki` mode with wiki claims, tasks, open questions, and lint findings.

Expanded UI/API surfaces:

- Dashboard tab with generic counts and wiki-specific summary panels.
- Tree tab with multi-root forest support.
- Graph tab with native relation labels.
- Database tab showing schema profile, runtime diagnostics, and active SQLite database.
- JSON, Markdown, Mermaid, CSV zip, and Obsidian zip exports.

## Data Source

The running app reads from the active SQLite database, not directly from JSON.

- Preferred runtime database: `llm_wiki.db`
- Supported legacy runtime database: `project2mindmap.db`
- Optional developer seed/import source: `project2mindmap_seed.json`
- Schema reference artifact: `project2mindmap_schema.sql`
- Legacy/generated seed DB: `project2mindmap_seed.db`

Current behavior:

1. If valid `llm_wiki.db` exists, FastAPI selects it by default on startup.
2. Supported database profiles are `llm_wiki` and `legacy_mindmap`.
3. The UI switches only between existing populated `.db` files in the workspace.
4. Empty databases are reported as empty; unsupported schemas are reported as unsupported.
5. Legacy ingestion/edit APIs return an explicit unsupported-profile error while `llm_wiki` is active.

## Troubleshooting

If the UI says the backend is stale or incompatible:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/metadata
```

The response should include `database_profile`, `code_profile_version`, `api_prefix`, and `server_started_at`. If those fields are missing, stop the old backend terminal and restart with:

```powershell
.\scripts\start.ps1
```

If the app says the frontend build is missing:

```powershell
.\scripts\build-ui.ps1
.\scripts\start.ps1
```

To start against a specific populated database manually:

```powershell
$env:PROJECT2MINDMAP_DB="llm_wiki.db"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
