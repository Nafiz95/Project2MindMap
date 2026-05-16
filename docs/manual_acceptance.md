# Manual Acceptance Runbook

Use this checklist before publishing a release or after a UI/API refactor.

## Startup

1. Build and start the one-port app:

   ```powershell
   .\scripts\start.ps1
   ```

2. Confirm runtime metadata:

   ```powershell
   .\scripts\check-runtime.ps1
   ```

3. Open `http://127.0.0.1:8000`.
4. Confirm the backend reports:
   - API prefix: `/api`
   - code profile: `llm_wiki_native_v1`
   - active database profile: `llm_wiki` or `legacy_mindmap`
   - `frontend_served_by_backend: true`

## Core UI

1. Confirm the header logo, navigation tabs, and Spotlight button render.
2. Confirm the default view loads without console errors.
3. Confirm the visible node/edge counts in the header match the loaded project.
4. Confirm the app handles refresh at a deep UI state without losing the ability to reload data.

## Overview

1. Open the **Overview** tab.
2. Confirm the filter pane appears with search, category, status, and importance filters.
3. Confirm the constellation/card grid shows project nodes.
4. Search for a known term from the active database and confirm matching nodes remain visible.
5. Apply category/status/importance filters and confirm the result count updates.
6. Click a node card and confirm the app navigates to **Focus** for that node.

## Focus

1. Select a node from Overview, Atlas, or Spotlight.
2. Confirm the Focus view shows:
   - breadcrumb/sibling context
   - node title, summary, and detail blocks
   - tags, aliases, sources, and related nodes when available
   - claims, tasks, open questions, and lint findings when present in `llm_wiki`
3. Click a related node and confirm Focus updates to that node.
4. Confirm the view handles nodes with no detail blocks or no related nodes gracefully.

## Atlas

1. Open the **Atlas** tab.
2. Confirm the graph renders nodes and edges.
3. Switch between available layout modes and confirm the graph remains visible.
4. Toggle lens/category controls and confirm nodes update.
5. Click a node and confirm the node rail shows details and neighbours.
6. Confirm the selected node can be opened in Focus.

## Momentum

1. Open the **Momentum** tab.
2. Confirm the activity heatmap renders.
3. Confirm the change stream renders recent node/edge events or an empty state.
4. Confirm active-front/progress cards render for active research items when available.
5. Confirm attention cards appear for open questions when available.

## Spotlight

1. Press `Ctrl+K` on Windows or `Cmd+K` on macOS.
2. Confirm Spotlight opens.
3. Search for a known node title.
4. Use keyboard navigation and Enter to select a result.
5. Confirm the selected node opens in Focus.
6. Press Escape and confirm Spotlight closes.

## Database

1. Open the **Database** tab.
2. Confirm the active database name, profile, status, counts, and path render.
3. Confirm populated `.db` files in the workspace appear in the switcher.
4. Switch to another populated database if available, then switch back.
5. Confirm invalid or empty databases are reported as unsupported/empty rather than silently loaded.

## API Checks

Run spot checks against the active project id from `/api/metadata`:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/metadata
Invoke-RestMethod http://127.0.0.1:8000/api/projects
Invoke-RestMethod http://127.0.0.1:8000/api/projects/<project_id>/tree
Invoke-RestMethod http://127.0.0.1:8000/api/projects/<project_id>/graph
Invoke-RestMethod http://127.0.0.1:8000/api/projects/<project_id>/activity?since=1970-01-01T00:00:00Z
```

Export endpoints should also respond:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/projects/<project_id>/export/json
Invoke-WebRequest http://127.0.0.1:8000/api/projects/<project_id>/export/markdown
Invoke-WebRequest http://127.0.0.1:8000/api/projects/<project_id>/export/mermaid
```

## Test Commands

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
