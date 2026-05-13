# MVP Manual Acceptance Runbook

1. Start the one-port app:

   ```powershell
   .\scripts\start.ps1
   ```

2. Confirm runtime metadata:

   ```powershell
   .\scripts\check-runtime.ps1
   ```

3. Open `http://127.0.0.1:8000`.
4. Confirm the Database tab reports `llm_wiki.db`, database profile `llm_wiki`, API prefix `/api`, and code profile `llm_wiki_native_v1`.
5. Confirm the Dashboard tab shows wiki counts plus tasks, open questions, lint findings, and claims.
6. Open the Tree tab and confirm multiple roots render, including `Project Overview` when present in the database.
7. Open a wiki page and confirm body content, sources, claims, tasks, open questions, and lint findings appear when available.
8. Search for terms present in wiki pages or enrichments such as `CheXBert`, `RadJEPA`, or `graph`; matched parent paths should remain visible.
9. Open the Graph tab and confirm wiki links render with native relation labels.
10. Open the Export tab and preview JSON, Markdown, and Mermaid.
11. Download CSV and Obsidian zip exports.
12. Switch to `project2mindmap.db` from the Database tab and confirm the legacy dashboard/tree/graph still load, then switch back to `llm_wiki.db`.

## Optional Frontend Development Check

1. Start the backend:

   ```powershell
   cd backend
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Start Vite in a second terminal:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

3. Open `http://localhost:5173`.
4. Confirm the UI loads through Vite and API calls still use `/api` through the proxy.

## Stale Backend Check

If the UI reports a stale or incompatible backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/metadata
```

The response must include `database_profile`, `code_profile_version`, `api_prefix`, and `server_started_at`. If those fields are missing, stop the old backend terminal and restart with `.\scripts\start.ps1`.
