# Project2MindMap

Local-first research knowledge-map app for exploring SQLite-backed project databases. The app supports the current `llm_wiki` database profile and a legacy mind-map profile, with tree, graph, dashboard, search, database inspection, and export views.

## How The App Runs

Project2MindMap has two pieces:

- **Backend:** FastAPI, running from `backend/app/main.py`.
- **Frontend:** React/Vite, living in `frontend/`.

For normal use, you do **not** need two long-running servers. FastAPI can serve the built React app and the API from one port:

- UI: `http://127.0.0.1:8000`
- API: `http://127.0.0.1:8000/api`
- Runtime check: `http://127.0.0.1:8000/api/metadata`

The backend terminal will stay occupied while FastAPI is running. That is still one running server; it just means you need a second terminal if you want to type more commands without stopping FastAPI.

Port `5173` is Vite's development/preview port. You should only need it when running `npm.cmd run dev` or `npm.cmd run preview`.

## One-Server Startup Without PowerShell Scripts

Use this for normal reading, reviewing, and demos. These commands can be run in one terminal in sequence. After the final `uvicorn` command starts, that terminal is running the server.

First build the frontend once:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
```

Then start FastAPI:

```powershell
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

If you later edit frontend code, stop FastAPI with `Ctrl+C`, rebuild with `npm.cmd run build`, start FastAPI again, then refresh the browser. For live frontend editing without restarting, use the two-terminal Vite workflow below.

If PowerShell blocks `npm.ps1`, keep using `npm.cmd` as shown above.

## Optional Script Startup

The repository also includes helper scripts:

```powershell
.\scripts\start.ps1
```

This script builds the frontend if `frontend/dist/index.html` is missing, checks whether port `8000` is already occupied by a compatible backend, and starts FastAPI. It is convenient, but it is not required.

To inspect a running backend with the helper script:

```powershell
.\scripts\check-runtime.ps1
```

## Frontend Development With Live Reload

Use two terminals when you want Vite live reload or when you want to keep FastAPI running while typing frontend commands.

Terminal 1:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Vite proxies relative `/api` calls to `http://127.0.0.1:8000/api`, so the frontend can use the same API paths in development and in the built one-server mode.

## Do We Need One Server Or Two?

One server is enough for normal use with the current tech stack. FastAPI already mounts the built React assets from `frontend/dist` and exposes the API under `/api`.

Two servers are still useful for frontend development:

- Vite gives fast refresh, better frontend error overlays, and quick rebuilds.
- FastAPI remains the API process.
- The Vite dev server forwards `/api` to FastAPI through `frontend/vite.config.ts`.

So the practical rule is:

- **Use one server** when you are using the app or reviewing data.
- **Use two servers** when you are changing React/CSS and want live reload.

It is also possible to add a single dev command later, for example a root-level npm script or a Python/Node process manager that starts both FastAPI and Vite together. That would reduce terminal hassle, but it would still be two development processes underneath.

## Data Source

The running app reads from an active SQLite database, not directly from JSON.

- Preferred runtime database: `llm_wiki.db`
- Supported legacy runtime database: `project2mindmap.db`
- Optional developer seed/import source: `project2mindmap_seed.json`
- Schema reference artifact: `project2mindmap_schema.sql`
- Legacy/generated seed DB: `project2mindmap_seed.db`

Startup behavior:

1. If a valid populated `llm_wiki.db` exists, FastAPI selects it by default.
2. Otherwise, FastAPI falls back to `project2mindmap.db`.
3. The Database tab can switch between existing populated `.db` files in the workspace.
4. Empty databases are reported as empty; unsupported schemas are reported as unsupported.
5. Write/ingestion APIs are guarded when the active profile does not support them.

To start against a specific populated database:

```powershell
$env:PROJECT2MINDMAP_DB="llm_wiki.db"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Checks

Backend tests:

```powershell
cd backend
python -m pytest
```

Frontend checks:

```powershell
cd frontend
npm.cmd run build
npm.cmd test -- --run
```

Developer-only legacy DB rebuild commands:

```powershell
cd backend
python -m app.cli.manage validate-seed --input ..\project2mindmap_seed.json
python -m app.cli.manage init-db --drop-existing
python -m app.cli.manage seed --input ..\project2mindmap_seed.json
```

## Troubleshooting

If the UI says the backend is stale or incompatible, check metadata:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/metadata
```

The response should include `database_profile`, `code_profile_version`, `api_prefix`, and `server_started_at`. If those fields are missing, stop the old backend terminal and restart FastAPI.

If the one-server UI says the frontend build is missing:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If port `8000` is already in use, stop the old process or choose another port:

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Then open `http://127.0.0.1:8001`.
