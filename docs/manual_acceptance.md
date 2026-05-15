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

## Feature Acceptance — New Views (v2)

Enable flags in the browser console before testing each feature:

```js
localStorage.setItem("p2mm.feature.review",   "on");
localStorage.setItem("p2mm.feature.focus",    "on");
localStorage.setItem("p2mm.feature.spotlight","on");
localStorage.setItem("p2mm.feature.atlas",    "on");
localStorage.setItem("p2mm.feature.momentum", "on");
localStorage.setItem("p2mm.feature.outline",  "on");
```

Reload the page after setting flags; new tabs appear in the header.

### Review Studio
1. Navigate to **Review** tab (requires a pending ingestion job — trigger one via the API or use `?job=<id>` in the URL).
2. Confirm three columns: Raw Source note on the left, Candidate Stack in the centre.
3. Use ✓ / ✗ buttons on each candidate card. Status counter in the header updates.
4. Approve all candidates; **Commit** button becomes active.
5. Click **Commit** — verify toast "Committed N candidates." and automatic redirect to Momentum.
6. Confirm **Reject job** navigates back to Momentum without writing any candidates.

### Focus
1. Click any node title in the Tree — verify navigation to the **Focus** view.
2. Confirm three columns: breadcrumb/siblings rail, reading column (node title, aliases, lede, detail blocks), connections rail.
3. For a Writing/Grant/Paper node, confirm the "Open in Outline →" button appears and navigates to Outline.
4. Confirm breadcrumb correctly traces the parent chain to the root.

### Spotlight (⌘K)
1. Press **⌘K** (or **Ctrl+K** on Windows) — overlay opens.
2. Type a search term; confirm NODES and SOURCES sections populate.
3. Use arrow keys to navigate results; press **Enter** to navigate to the node.
4. Press **Escape** to dismiss.
5. Test category filter chips (Model, Experiment, Paper, etc.) — results narrow correctly.

### Atlas
1. Open the **Atlas** tab.
2. Confirm a force-directed SVG graph renders with node circles and edge lines.
3. Drag a node — it pins and stops being pushed by the simulation (dashed ring appears).
4. Right-click a pinned node — context menu offers "Unpin".
5. Use the lens rail to toggle categories on/off — nodes appear/disappear.
6. Zoom in/out with scroll; ⊕/⊖ HUD buttons work.
7. Click a node — right-hand node rail shows details and neighbours.

### Momentum
1. Open the **Momentum** tab.
2. Confirm Activity Heatmap renders a 13×7 grid (last 90 days).
3. Confirm Change Stream lists recent node/edge events with relative timestamps.
4. Confirm Active Fronts shows progress strips for active Experiment/Writing/Grant nodes.
5. If pending ingestion jobs exist, confirm an Attention Card appears and clicking it navigates to Review Studio.

### Outline
1. Navigate to a Writing, Grant, or Paper node; open **Outline** tab.
2. Confirm three columns: section tree (left), doc editor (centre), evidence sidebar (right).
3. Click a section in the tree — centre column switches to that block.
4. Click the block text to enter edit mode; type `@` to trigger the inline node picker.
5. Select a node from the picker — an `@[id|Title|category]` chip is inserted.
6. Click away (blur) — content auto-saves and the chip appears styled in the evidence sidebar.
7. Confirm the sidebar shows cited chips and suggested uncited nodes.
8. With `llm_wiki.db` active, confirm all blocks are read-only and the orange "read-only" label appears.

---

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
