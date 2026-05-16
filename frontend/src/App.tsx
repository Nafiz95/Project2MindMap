import { useEffect, useMemo, useState } from "react";

import logoUrl from "./assets/logo.png";
import { api } from "./api/client";
import type { GraphPayload, MetadataPayload, TreeNode, TreePayload } from "./types";
import { useGlobalKeymap } from "./utils/keymap";
import { Spotlight } from "./components/Spotlight";
import { FocusView } from "./views/Focus/FocusView";
import { AtlasView } from "./views/Atlas/AtlasView";
import { MomentumView } from "./views/Momentum/MomentumView";
import { ConstellationGrid } from "./views/Overview/ConstellationGrid";

type ViewName =
  | "momentum"
  | "overview"
  | "atlas"
  | "focus"
  | "database";

const FULL_PAGE_VIEWS = new Set<ViewName>(["atlas", "focus", "momentum"]);
const ALL_VIEWS: ViewName[] = ["momentum", "overview", "atlas", "focus", "database"];

function App() {
  const [view, setView] = useState<ViewName>("overview");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreePayload | null>(null);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [importance, setImportance] = useState("all");
  const [searchResultIds, setSearchResultIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isWikiProfile = metadata?.database_profile?.includes("llm_wiki") ?? false;

  const nodesById = useMemo(() => {
    const map = new Map<string, TreeNode>();
    tree?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [tree]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useGlobalKeymap({
    onSpotlight: () => setSpotlightOpen(true),
    onClose: () => { setSpotlightOpen(false); },
    onGoAtlas:    () => setView("atlas"),
    onGoFocus:    () => setView("focus"),
    onGoMomentum: () => setView("momentum"),
  });

  useEffect(() => {
    if (window.location.search) history.replaceState(null, "", window.location.pathname);
    loadAll();
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) { setSearchResultIds(null); return; }
    const handle = window.setTimeout(() => {
      if (!projectId) return;
      api
        .search(projectId, query)
        .then((rows) => {
          const matches = new Set(rows.map((row) => row.id));
          setSearchResultIds(matches);
          setExpanded((current) => expandAncestors(current, rows.map((row) => row.id), nodesById));
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Search failed"));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [search, nodesById, projectId]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const metadataPayload = await api.metadata();
      setMetadata(metadataPayload);
      const activeProjectId = metadataPayload.active_project_id;
      if (!metadataPayload.is_populated || !activeProjectId) {
        setProjectId(null);
        setTree(null);
        setGraph(null);
        setSelectedId(null);
        setView("database");
        setError("The active database is empty or invalid. Switch to a populated .db file.");
        return;
      }
      setProjectId(activeProjectId);
      const [treePayload, graphPayload] = await Promise.all([
        api.tree(activeProjectId),
        api.graph(activeProjectId),
      ]);
      setTree(treePayload);
      setGraph(graphPayload);
      const initialRoots = treeRoots(treePayload);
      setSelectedId((current) => current ?? initialRoots[0] ?? null);
      setExpanded(new Set([...initialRoots, ...treePayload.nodes.slice(0, 12).map((node) => node.id)]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Project2MindMap");
    } finally {
      setLoading(false);
    }
  }

  function navigateTo(v: string, nodeId?: string) {
    setView(v as ViewName);
    if (nodeId) setSelectedId(nodeId);
  }

  const filteredIds = useMemo(() => {
    if (!tree) return new Set<string>();
    return new Set(
      tree.nodes
        .filter((node) => {
          const textMatches = !searchResultIds || searchResultIds.has(node.id);
          return (
            textMatches &&
            (category === "all" || node.category === category) &&
            (status === "all" || node.status === status) &&
            (importance === "all" || node.importance === importance)
          );
        })
        .map((node) => node.id),
    );
  }, [tree, searchResultIds, category, status, importance]);

  const visibleTreeIds = useMemo(() => includeAncestorsAndDescendantMatches(filteredIds, nodesById), [filteredIds, nodesById]);
  const categories = useMemo(() => unique(tree?.nodes.map((node) => node.category) ?? []), [tree]);
  const statuses = useMemo(() => unique(tree?.nodes.map((node) => node.status) ?? []), [tree]);
  const importances = useMemo(() => unique(tree?.nodes.map((node) => node.importance) ?? []), [tree]);

  async function switchDatabase(databaseName: string) {
    setError(null);
    try {
      await api.switchDatabase(databaseName);
      setSelectedId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch database");
    }
  }

  if (loading) return <main className="center">Loading Project2MindMap…</main>;

  const isFullPage = FULL_PAGE_VIEWS.has(view);

  // Tabs shown in the header — Focus is navigated to by clicking a node, not a tab
  const NAV_TABS: ViewName[] = ["momentum", "overview", "atlas", "database"];

  return (
    <main className="appShell">
      <header className="topBar">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logoUrl} alt="Project2MindMap" style={{ height: "clamp(48px, 5.9vw, 85px)", width: "auto", display: "block" }} />
          <nav className="tabs">
            {NAV_TABS.map((item) => (
              <button
                key={item}
                className={view === item || (item === "overview" && view === "focus") ? "activeTab" : ""}
                onClick={() => setView(item)}
              >
                {label(item)}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {projectId && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {tree?.nodes.length ?? 0}n · {graph?.edges.length ?? 0}e
            </span>
          )}
          <button
            onClick={() => setSpotlightOpen(true)}
            style={{
              marginLeft: 4,
              padding: "3px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.4px",
              background: "var(--paper-deep)",
              border: "1px solid var(--rule)",
              borderRadius: 4,
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            ⌘K
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {spotlightOpen && projectId && (
        <Spotlight
          projectId={projectId}
          nodesById={nodesById}
          selectedId={selectedId}
          onClose={() => setSpotlightOpen(false)}
          onSelect={setSelectedId}
          onNavigate={navigateTo}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <section className={isFullPage ? "workspace fullPage" : "workspace"}>
        {view === "overview" && (
          <aside className="leftPane">
            <FilterPanel
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              status={status}
              setStatus={setStatus}
              importance={importance}
              setImportance={setImportance}
              categories={categories}
              statuses={statuses}
              importances={importances}
              matchedCount={filteredIds.size}
              totalCount={tree?.nodes.length ?? 0}
            />
          </aside>
        )}

        <section className="mainPane">
          {/* Overview: constellation card grid */}
          {view === "overview" && tree && (
            <ConstellationGrid
              tree={tree}
              nodesById={nodesById}
              filteredIds={filteredIds}
              hasActiveFilter={!!(search.trim() || category !== "all" || status !== "all" || importance !== "all")}
              onSelect={(id) => { setSelectedId(id); setView("focus"); }}
            />
          )}

          {/* Focus — full-page node reading */}
          {view === "focus" && projectId && selectedId && (
            <FocusView
              projectId={projectId}
              nodeId={selectedId}
              nodesById={nodesById}
              onSelect={(id) => { setSelectedId(id); }}
              onNavigate={navigateTo}
            />
          )}
          {view === "focus" && (!projectId || !selectedId) && (
            <div className="featureView" style={{ padding: 40 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
                Select a node from the tree or Spotlight to open it in Focus.
              </p>
            </div>
          )}

          {/* Atlas — force-directed graph (replaces old GraphView) */}
          {view === "atlas" && graph && projectId && (
            <AtlasView
              graph={graph}
              projectId={projectId}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNavigate={navigateTo}
            />
          )}

          {/* Momentum — temporal dashboard */}
          {view === "momentum" && projectId && (
            <MomentumView
              projectId={projectId}
              tree={tree}
              onNavigate={navigateTo}
              onSelect={(id) => { setSelectedId(id); navigateTo("focus", id); }}
            />
          )}

          {view === "database" && metadata && <DatabaseView metadata={metadata} onSwitch={switchDatabase} />}
        </section>
      </section>
    </main>
  );
}

function FilterPanel(props: {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  importance: string;
  setImportance: (value: string) => void;
  categories: string[];
  statuses: string[];
  importances: string[];
  matchedCount: number;
  totalCount: number;
}) {
  return (
    <div className="filters">
      <input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Search nodes, details, tags, sources" />
      <select value={props.category} onChange={(event) => props.setCategory(event.target.value)}>
        <option value="all">All categories</option>
        {props.categories.map((item) => (
          <option key={item} value={item}>{formatLabel(item)}</option>
        ))}
      </select>
      <select value={props.status} onChange={(event) => props.setStatus(event.target.value)}>
        <option value="all">All statuses</option>
        {props.statuses.map((item) => (
          <option key={item} value={item}>{formatLabel(item)}</option>
        ))}
      </select>
      <select value={props.importance} onChange={(event) => props.setImportance(event.target.value)}>
        <option value="all">All importance</option>
        {props.importances.map((item) => (
          <option key={item} value={item}>{formatLabel(item)}</option>
        ))}
      </select>
      <small className="muted">
        Showing {props.matchedCount} of {props.totalCount}
      </small>
    </div>
  );
}

function TreeToolbar({ onExpandAll, onCollapseAll }: { onExpandAll: () => void; onCollapseAll: () => void }) {
  return (
    <div className="treeToolbar">
      <button onClick={onExpandAll}>Expand All</button>
      <button onClick={onCollapseAll}>Collapse</button>
    </div>
  );
}

function TreeBranch({
  nodeId,
  nodesById,
  visibleIds,
  matchedIds,
  expanded,
  selectedId,
  query,
  onToggle,
  onSelect,
}: {
  nodeId: string;
  nodesById: Map<string, TreeNode>;
  visibleIds: Set<string>;
  matchedIds: Set<string>;
  expanded: Set<string>;
  selectedId: string | null;
  query: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const node = nodesById.get(nodeId);
  if (!node || !visibleIds.has(node.id)) return null;
  const isExpanded = expanded.has(node.id);
  const childCount = node.child_ids.length;
  return (
    <div className="treeBranch">
      <div className={`treeNode ${selectedId === node.id ? "selected" : ""} ${matchedIds.has(node.id) ? "matched" : ""}`}>
        <button className="iconButton" onClick={() => onToggle(node.id)} disabled={childCount === 0}>
          {childCount === 0 ? "" : isExpanded ? "v" : ">"}
        </button>
        <button className="nodeButton" onClick={() => onSelect(node.id)}>
          <span>{highlight(node.title, query)}</span>
          <small>
            {formatLabel(node.category)} / {formatLabel(node.status)} / {formatLabel(node.importance)} {childCount ? `/ ${childCount} children` : ""}
          </small>
        </button>
        <i className={`categoryStrip ${categoryClass(node.category)}`} />
      </div>
      {isExpanded && (
        <div className="children">
          {node.child_ids.map((childId) => (
            <TreeBranch
              key={childId}
              nodeId={childId}
              nodesById={nodesById}
              visibleIds={visibleIds}
              matchedIds={matchedIds}
              expanded={expanded}
              selectedId={selectedId}
              query={query}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function DatabaseView({
  metadata,
  onSwitch,
}: {
  metadata: MetadataPayload;
  onSwitch: (databaseName: string) => void;
}) {
  const [selectedDatabase, setSelectedDatabase] = useState(metadata.database_name);

  useEffect(() => {
    setSelectedDatabase(metadata.database_name);
  }, [metadata.database_name]);

  return (
    <section>
      <h2>Database Source</h2>
      <div className="dataSourceGrid">
        <DataSourceRow label="Runtime store" value={metadata.runtime_store} />
        <DataSourceRow label="Database profile" value={formatLabel(metadata.database_profile)} />
        <DataSourceRow label="Code profile" value={metadata.code_profile_version} />
        <DataSourceRow label="API prefix" value={metadata.api_prefix} />
        <DataSourceRow label="Server started" value={metadata.server_started_at} />
        <DataSourceRow label="Frontend served by backend" value={metadata.frontend_served_by_backend ? "yes" : "no"} />
        <DataSourceRow label="Active project" value={metadata.active_project_id} />
        <DataSourceRow label="SQLite database" value={metadata.database_path} />
        <DataSourceRow label="Database exists" value={metadata.database_exists ? "yes" : "no"} />
        <DataSourceRow label="Database status" value={metadata.database_status} />
        <DataSourceRow label="Projects" value={metadata.project_count} />
        <DataSourceRow label="Nodes" value={metadata.node_count} />
        <DataSourceRow label="Edges / links" value={metadata.edge_count || metadata.link_count} />
        <DataSourceRow label="Claims" value={metadata.claim_count} />
        <DataSourceRow label="Tasks" value={metadata.task_count} />
        <DataSourceRow label="Open questions" value={metadata.question_count} />
        <DataSourceRow label="Lint findings" value={metadata.lint_count} />
        <DataSourceRow label="Database size" value={`${Math.round(metadata.database_size_bytes / 1024)} KB`} />
        <DataSourceRow label="Schema SQL" value={metadata.schema_sql_path} />
      </div>
      <h3>How Loading Works</h3>
      <ul className="notesList">
        {metadata.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p className="muted">
        Place a populated .db file in the Project2MindMap workspace, then switch to it here without setting PROJECT2MINDMAP_DB in PowerShell.
      </p>

      <h3>Switch Active Database</h3>
      <div className="databaseControls">
        <select value={selectedDatabase} onChange={(event) => setSelectedDatabase(event.target.value)}>
          {metadata.available_databases.map((database) => (
            <option key={database.name} value={database.name}>
              {database.name}
              {database.active ? " (active)" : ""}
              {database.name === "llm_wiki.db" ? " (preferred)" : ""}
              {database.database_profile !== "invalid" ? ` (${formatLabel(database.database_profile)})` : ""}
              {!database.is_populated ? " (empty)" : ""}
            </option>
          ))}
        </select>
        <button onClick={() => onSwitch(selectedDatabase)} disabled={!selectedDatabase || selectedDatabase === metadata.database_name}>
          Switch Database
        </button>
      </div>

      <div className="databaseList">
        {metadata.available_databases.map((database) => (
          <div className="databaseRow" key={database.name}>
            <strong>{database.name}</strong>
            <span>{formatLabel(database.database_profile)} / {database.status}</span>
            <small>
              {database.project_count} projects / {database.node_count} nodes / {database.edge_count || database.link_count} edges / {Math.round(database.size_bytes / 1024)} KB
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataSourceRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="dataSourceRow">
      <strong>{label}</strong>
      <code>{value ?? "none"}</code>
    </div>
  );
}

// ── Pure utility functions ────────────────────────────────────────────────────

function includeAncestorsAndDescendantMatches(matchedIds: Set<string>, nodesById: Map<string, TreeNode>): Set<string> {
  const visible = new Set(matchedIds);
  for (const id of matchedIds) {
    let node = nodesById.get(id);
    while (node?.parent_id) {
      visible.add(node.parent_id);
      node = nodesById.get(node.parent_id);
    }
  }
  return visible;
}

function expandAncestors(current: Set<string>, matchedIds: string[], nodesById: Map<string, TreeNode>): Set<string> {
  const next = new Set(current);
  matchedIds.forEach((id) => {
    let node = nodesById.get(id);
    while (node?.parent_id) {
      next.add(node.parent_id);
      node = nodesById.get(node.parent_id);
    }
  });
  return next;
}

function highlight(value: string, query: string) {
  if (!query.trim()) return value;
  const index = value.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark>{value.slice(index, index + query.length)}</mark>
      {value.slice(index + query.length)}
    </>
  );
}

function label(value: ViewName): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "None";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function categoryClass(value: string): string {
  return `cat${Math.abs(hash(value)) % 8}`;
}

function hash(value: string): number {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function treeRoots(tree: TreePayload): string[] {
  return tree.root_ids?.length ? tree.root_ids : tree.root_id ? [tree.root_id] : [];
}

export default App;
