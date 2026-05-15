import { useEffect, useMemo, useState } from "react";

import { api, apiUrl } from "./api/client";
import type { DashboardPayload, GraphPayload, MetadataPayload, NodeDetail, NodeSummary, TreeNode, TreePayload, WikiItem } from "./types";
import { useGlobalKeymap } from "./utils/keymap";
import { Spotlight } from "./components/Spotlight";
import { ReviewStudioView } from "./views/ReviewStudio/ReviewStudioView";
import { FocusView } from "./views/Focus/FocusView";
import { AtlasView } from "./views/Atlas/AtlasView";
import { MomentumView } from "./views/Momentum/MomentumView";
import { OutlineView } from "./views/Outline/OutlineView";

type ViewName =
  | "momentum"
  | "overview"
  | "atlas"
  | "focus"
  | "outline"
  | "review"
  | "database"
  | "export";

const FULL_PAGE_VIEWS = new Set<ViewName>(["atlas", "focus", "momentum", "outline", "review"]);
const ALL_VIEWS: ViewName[] = ["momentum", "overview", "atlas", "focus", "outline", "review", "database", "export"];

function App() {
  const [view, setView] = useState<ViewName>(() => {
    const p = new URLSearchParams(window.location.search).get("view") as ViewName | null;
    return p && ALL_VIEWS.includes(p) ? p : "momentum";
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreePayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("node"),
  );
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [importance, setImportance] = useState("all");
  const [relation, setRelation] = useState("all");
  const [depth, setDepth] = useState<"1" | "2" | "all">("1");
  const [searchResultIds, setSearchResultIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportPreview, setExportPreview] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isWikiProfile = metadata?.database_profile?.includes("llm_wiki") ?? false;

  const nodesById = useMemo(() => {
    const map = new Map<string, TreeNode>();
    tree?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [tree]);

  // Sync view + selectedId to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    if (selectedId) params.set("node", selectedId); else params.delete("node");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [view, selectedId]);

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
    onGoReview:   () => setView("review"),
    onGoMomentum: () => setView("momentum"),
    onGoOutline:  () => setView("outline"),
    onGoExport:   () => setView("export"),
  });

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedId || !projectId) return;
    api
      .nodeDetail(projectId, selectedId)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load node"));
  }, [selectedId, projectId]);

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
        setDashboard(null);
        setGraph(null);
        setSelectedId(null);
        setDetail(null);
        setView("database");
        setError("The active database is empty or invalid. Switch to a populated .db file.");
        return;
      }
      setProjectId(activeProjectId);
      const [treePayload, dashboardPayload, graphPayload] = await Promise.all([
        api.tree(activeProjectId),
        api.dashboard(activeProjectId),
        api.graph(activeProjectId),
      ]);
      setTree(treePayload);
      setDashboard(dashboardPayload);
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

  async function exportProject(format: "json" | "markdown" | "mermaid") {
    if (!projectId) return;
    const payload =
      format === "json"
        ? JSON.stringify(await api.exportJson(projectId), null, 2)
        : await api.exportText(projectId, format);
    setExportPreview(payload.slice(0, 10000));
  }

  async function switchDatabase(databaseName: string) {
    setError(null);
    try {
      await api.switchDatabase(databaseName);
      setSelectedId(null);
      setDetail(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch database");
    }
  }

  if (loading) return <main className="center">Loading Project2MindMap…</main>;

  const isFullPage = FULL_PAGE_VIEWS.has(view);

  // Tabs shown in the header — Focus is navigated to by clicking a node, not a tab
  const NAV_TABS: ViewName[] = ["momentum", "overview", "atlas", "outline", "review", "database", "export"];

  return (
    <main className="appShell">
      <header className="topBar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Project2MindMap</h1>
          {projectId && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {tree?.nodes.length ?? 0}n · {graph?.edges.length ?? 0}e
            </span>
          )}
        </div>
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
          <button
            onClick={() => setSpotlightOpen(true)}
            style={{
              marginLeft: 8,
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
        </nav>
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
            <TreeToolbar
              onExpandAll={() => setExpanded(new Set(tree?.nodes.map((node) => node.id) ?? []))}
              onCollapseAll={() => setExpanded(new Set(tree ? treeRoots(tree) : []))}
            />
            <div className="treePane">
              {(tree ? treeRoots(tree) : []).length ? (
                (tree ? treeRoots(tree) : []).map((rootId) => (
                  <TreeBranch
                    key={rootId}
                    nodeId={rootId}
                    nodesById={nodesById}
                    visibleIds={visibleTreeIds}
                    matchedIds={filteredIds}
                    expanded={expanded}
                    selectedId={selectedId}
                    query={search}
                    onToggle={(id) => {
                      const next = new Set(expanded);
                      next.has(id) ? next.delete(id) : next.add(id);
                      setExpanded(next);
                    }}
                    onSelect={(id) => { setSelectedId(id); setView("focus"); }}
                  />
                ))
              ) : (
                <p className="muted">No root node found.</p>
              )}
            </div>
          </aside>
        )}

        <section className="mainPane">
          {/* Overview: prompt to select a node (left pane has the tree browser) */}
          {view === "overview" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 40 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 16 }}>
                Click a node in the tree to read it in Focus.
              </p>
            </div>
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

          {/* Momentum — temporal dashboard (replaces old DashboardView) */}
          {view === "momentum" && projectId && (
            <MomentumView
              projectId={projectId}
              tree={tree}
              dashboard={dashboard}
              onNavigate={navigateTo}
              onSelect={(id) => { setSelectedId(id); navigateTo("focus", id); }}
            />
          )}

          {/* Outline — writing editor for Grant/Paper/Writing nodes */}
          {view === "outline" && projectId && selectedId && (
            <OutlineView
              projectId={projectId}
              nodeId={selectedId}
              nodesById={nodesById}
              onNavigate={navigateTo}
              isWikiProfile={isWikiProfile}
            />
          )}
          {view === "outline" && (!projectId || !selectedId) && (
            <div className="featureView" style={{ padding: 40 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
                Select a Writing, Grant, or Paper node to open it in Outline.
              </p>
            </div>
          )}

          {/* Review Studio */}
          {view === "review" && (
            <ReviewStudioView onNavigate={navigateTo} onToast={setToast} />
          )}

          {/* Database and Export */}
          {view === "database" && metadata && <DatabaseView metadata={metadata} onSwitch={switchDatabase} />}
          {view === "export" && projectId && <ExportView projectId={projectId} exportProject={exportProject} exportPreview={exportPreview} />}
        </section>
      </section>
    </main>
  );
}

// ── All the existing sub-components below are unchanged ──────────────────────

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

function DashboardView({ dashboard, onSelect, setView }: { dashboard: DashboardPayload; onSelect: (id: string) => void; setView: (view: ViewName) => void }) {
  return (
    <div className="dashboard">
      <div className="metricGrid">
        {Object.entries(dashboard.counts).map(([key, value]) => (
          <div className="metric" key={key}>
            <strong>{value}</strong>
            <span>{formatLabel(key)}</span>
          </div>
        ))}
      </div>
      {dashboard.wiki_dashboard && <WikiDashboard dashboard={dashboard.wiki_dashboard} onSelect={onSelect} setView={setView} />}
      <DashboardSection title="Active Experiments" nodes={dashboard.active_experiments} onSelect={onSelect} setView={setView} />
      <DashboardSection title="Open Questions" nodes={dashboard.open_questions} onSelect={onSelect} setView={setView} />
      <DashboardSection title="Writing And Grants" nodes={dashboard.writing_and_grants} onSelect={onSelect} setView={setView} />
      <DashboardSection title="Recently Updated" nodes={dashboard.recent_nodes} onSelect={onSelect} setView={setView} />
    </div>
  );
}

function WikiDashboard({
  dashboard,
  onSelect,
  setView,
}: {
  dashboard: NonNullable<DashboardPayload["wiki_dashboard"]>;
  onSelect: (id: string) => void;
  setView: (view: ViewName) => void;
}) {
  return (
    <section className="wikiDashboard">
      <h2>LLM Wiki Signals</h2>
      <div className="metricGrid compactMetrics">
        {Object.entries(dashboard.counts).map(([key, value]) => (
          <div className="metric" key={key}>
            <strong>{value}</strong>
            <span>{formatLabel(key)}</span>
          </div>
        ))}
      </div>
      <WikiItemSection title="Open Questions" items={dashboard.open_questions} onSelect={onSelect} setView={setView} />
      <WikiItemSection title="Tasks" items={dashboard.tasks} onSelect={onSelect} setView={setView} />
      <WikiItemSection title="Lint Findings" items={dashboard.lint_findings} onSelect={onSelect} setView={setView} />
      <WikiItemSection title="Claims" items={dashboard.claims} onSelect={onSelect} setView={setView} />
    </section>
  );
}

function WikiItemSection({
  title,
  items,
  onSelect,
  setView,
}: {
  title: string;
  items: WikiItem[];
  onSelect: (id: string) => void;
  setView: (view: ViewName) => void;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <div className="cardGrid">
        {items.map((item) => (
          <button
            className="nodeCard"
            key={item.id}
            onClick={() => {
              if (!item.related_page_id) return;
              onSelect(item.related_page_id);
              setView("overview");
            }}
          >
            <strong>{item.title}</strong>
            <small>{wikiMeta(item)}</small>
            {item.related_page_title && <span>{item.related_page_title}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

function DashboardSection({ title, nodes, onSelect, setView }: { title: string; nodes: NodeSummary[]; onSelect: (id: string) => void; setView: (view: ViewName) => void }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="cardGrid">
        {nodes.map((node) => (
          <button
            className="nodeCard"
            key={node.id}
            onClick={() => {
              onSelect(node.id);
              setView("overview");
            }}
          >
            <strong>{node.title}</strong>
            <small>
              {formatLabel(node.category)} / {formatLabel(node.status)} / {formatLabel(node.importance)}
            </small>
            <span>{node.summary}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GraphView({
  graph,
  selectedId,
  category,
  status,
  relation,
  setRelation,
  depth,
  setDepth,
  onSelect,
}: {
  graph: GraphPayload;
  selectedId: string | null;
  category: string;
  status: string;
  relation: string;
  setRelation: (value: string) => void;
  depth: "1" | "2" | "all";
  setDepth: (value: "1" | "2" | "all") => void;
  onSelect: (id: string) => void;
}) {
  const visible = useMemo(() => visibleGraph(graph, selectedId, category, status, relation, depth), [graph, selectedId, category, status, relation, depth]);
  const positions = useMemo(() => layoutGraph(visible.nodes), [visible.nodes]);
  return (
    <div className="graphView">
      <div className="graphControls">
        <select value={relation} onChange={(event) => setRelation(event.target.value)}>
          <option value="all">All relations</option>
          {unique(graph.edges.map((edge) => edge.relation_type)).map((item) => (
            <option key={item} value={item}>{formatLabel(item)}</option>
          ))}
        </select>
        <select value={depth} onChange={(event) => setDepth(event.target.value as "1" | "2" | "all")}>
          <option value="1">1-hop</option>
          <option value="2">2-hop</option>
          <option value="all">All</option>
        </select>
        <small className="muted">
          {visible.nodes.length} nodes / {visible.edges.length} edges
        </small>
      </div>
      <svg className="graphCanvas" viewBox="0 0 1200 760" role="img" aria-label="Project graph">
        {visible.edges.map((edge) => {
          const source = positions.get(edge.source_node_id);
          const target = positions.get(edge.target_node_id);
          if (!source || !target) return null;
          return (
            <g key={edge.id}>
              <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="graphEdge" />
              <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2} className="edgeLabel">
                {formatLabel(edge.relation_type)}
              </text>
            </g>
          );
        })}
        {visible.nodes.map((node) => {
          const point = positions.get(node.id);
          if (!point) return null;
          return (
            <g key={node.id} transform={`translate(${point.x - 76}, ${point.y - 32})`} onClick={() => onSelect(node.id)} className="graphNode">
              <rect width="152" height="64" rx="8" className={`${selectedId === node.id ? "selectedRect" : ""} ${categoryClass(node.category)}`} />
              <text x="12" y="23" className="graphTitle">
                {truncate(node.title, 20)}
              </text>
              <text x="12" y="44" className="graphMeta">
                {formatLabel(node.category)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function NodeDetailPanel({
  detail,
  onSelect,
}: {
  detail: NodeDetail;
  onSelect: (id: string) => void;
}) {
  return (
    <article>
      <div className="detailHeader">
        <h2>{detail.node.title}</h2>
        <div className="badges">
          <span>{formatLabel(detail.node.category)}</span>
          <span>{formatLabel(detail.node.status)}</span>
          <span>{formatLabel(detail.node.importance)}</span>
        </div>
      </div>
      <p>{detail.node.summary}</p>
      {detail.node.description && <p className="muted">{detail.node.description}</p>}

      <h3>Details</h3>
      {detail.detail_blocks.length === 0 && <p className="muted">No detail blocks.</p>}
      {detail.detail_blocks.map((block) => (
        <section key={block.id} className="detailBlock">
          <h4>{block.title}</h4>
          <p>{block.content}</p>
        </section>
      ))}

      <h3>Related Nodes</h3>
      <div className="relatedList">
        {detail.related_nodes.map((node) => (
          <button key={node.id} onClick={() => onSelect(node.id)}>
            {node.title}
          </button>
        ))}
      </div>

      <h3>Tags And Aliases</h3>
      <p className="muted">{[...detail.tags, ...detail.aliases].join(", ") || "None"}</p>

      <WikiDetailSection title="Claims" items={detail.claims ?? []} onSelect={onSelect} />
      <WikiDetailSection title="Tasks" items={detail.tasks ?? []} onSelect={onSelect} />
      <WikiDetailSection title="Open Questions" items={detail.open_questions ?? []} onSelect={onSelect} />
      <WikiDetailSection title="Lint Findings" items={detail.lint_findings ?? []} onSelect={onSelect} />
    </article>
  );
}

function WikiDetailSection({ title, items, onSelect }: { title: string; items: WikiItem[]; onSelect: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="wikiDetailSection">
      <h3>{title}</h3>
      <div className="detailList">
        {items.map((item) => (
          <article className="detailBlock" key={item.id}>
            <h4>{item.title}</h4>
            <p className="muted">{wikiMeta(item)}</p>
            {item.description && item.description !== item.title && <p>{item.description}</p>}
            {item.related_page_id && item.related_page_title && (
              <button className="textButton" onClick={() => onSelect(item.related_page_id!)}>
                Open {item.related_page_title}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ExportView({
  projectId,
  exportProject,
  exportPreview,
}: {
  projectId: string;
  exportProject: (format: "json" | "markdown" | "mermaid") => void;
  exportPreview: string;
}) {
  return (
    <section>
      <h2>Export</h2>
      <div className="buttonRow">
        <button onClick={() => exportProject("json")}>Preview JSON</button>
        <button onClick={() => exportProject("markdown")}>Preview Markdown</button>
        <button onClick={() => exportProject("mermaid")}>Preview Mermaid</button>
        <a href={apiUrl(`/projects/${projectId}/export/csv`)}>Download CSV Zip</a>
        <a href={apiUrl(`/projects/${projectId}/export/obsidian`)}>Download Obsidian Zip</a>
      </div>
      {exportPreview && <pre className="exportPreview">{exportPreview}</pre>}
    </section>
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

function visibleGraph(graph: GraphPayload, selectedId: string | null, category: string, status: string, relation: string, depth: "1" | "2" | "all") {
  let edges = graph.edges.filter((edge) => relation === "all" || edge.relation_type === relation);
  let nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (selectedId && depth !== "all") {
    nodeIds = neighborhoodIds(edges, selectedId, depth === "1" ? 1 : 2);
    nodeIds.add(selectedId);
  }
  const nodes = graph.nodes.filter(
    (node) =>
      nodeIds.has(node.id) &&
      (category === "all" || node.category === category) &&
      (status === "all" || node.status === status),
  );
  const finalIds = new Set(nodes.map((node) => node.id));
  edges = edges.filter((edge) => finalIds.has(edge.source_node_id) && finalIds.has(edge.target_node_id));
  return { nodes, edges };
}

function neighborhoodIds(edges: GraphPayload["edges"], selectedId: string, maxDepth: number): Set<string> {
  const seen = new Set<string>([selectedId]);
  let frontier = new Set<string>([selectedId]);
  for (let depth = 0; depth < maxDepth; depth++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.source_node_id) && !seen.has(edge.target_node_id)) next.add(edge.target_node_id);
      if (frontier.has(edge.target_node_id) && !seen.has(edge.source_node_id)) next.add(edge.source_node_id);
    }
    next.forEach((id) => seen.add(id));
    frontier = next;
  }
  return seen;
}

function layoutGraph(nodes: GraphPayload["nodes"]): Map<string, { x: number; y: number }> {
  const center = { x: 600, y: 380 };
  const byCategory = new Map<string, GraphPayload["nodes"]>();
  nodes.forEach((node) => byCategory.set(node.category, [...(byCategory.get(node.category) ?? []), node]));
  const positions = new Map<string, { x: number; y: number }>();
  const categories = [...byCategory.keys()].sort();
  categories.forEach((category, categoryIndex) => {
    const categoryNodes = byCategory.get(category) ?? [];
    const categoryAngle = (categoryIndex / Math.max(categories.length, 1)) * Math.PI * 2;
    const categoryCenter = {
      x: center.x + Math.cos(categoryAngle) * 250,
      y: center.y + Math.sin(categoryAngle) * 190,
    };
    categoryNodes.forEach((node, nodeIndex) => {
      const angle = (nodeIndex / Math.max(categoryNodes.length, 1)) * Math.PI * 2;
      positions.set(node.id, {
        x: categoryCenter.x + Math.cos(angle) * Math.min(110, 28 * categoryNodes.length),
        y: categoryCenter.y + Math.sin(angle) * Math.min(82, 20 * categoryNodes.length),
      });
    });
  });
  return positions;
}

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

function wikiMeta(item: WikiItem): string {
  return [
    item.status ? formatLabel(item.status) : null,
    item.priority ? `${formatLabel(item.priority)} priority` : null,
    item.severity ? `${formatLabel(item.severity)} severity` : null,
    item.finding_type ? formatLabel(item.finding_type) : null,
    item.claim_type ? formatLabel(item.claim_type) : null,
    typeof item.confidence === "number" ? `${Math.round(item.confidence * 100)}% confidence` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function categoryClass(value: string): string {
  return `cat${Math.abs(hash(value)) % 8}`;
}

function hash(value: string): number {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function treeRoots(tree: TreePayload): string[] {
  return tree.root_ids?.length ? tree.root_ids : tree.root_id ? [tree.root_id] : [];
}

export default App;
