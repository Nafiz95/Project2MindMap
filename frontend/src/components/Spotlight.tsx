import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { TreeNode } from "../types";
import { CatPill } from "./primitives/CatPill";

type Filter = "title" | "summary" | "tags" | "aliases" | "details" | "sources";
const ALL_FILTERS: Filter[] = ["title", "summary", "tags", "aliases", "details", "sources"];

function highlightQuery(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="spotlightMark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type ActionRow = { id: string; label: string; shortcut: string; action: () => void };

export function Spotlight({
  projectId,
  nodesById,
  selectedId,
  onClose,
  onSelect,
  onNavigate,
}: {
  projectId: string;
  nodesById: Map<string, TreeNode>;
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNavigate: (view: string, nodeId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TreeNode[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  const [timing, setTiming] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<Filter>>(new Set(ALL_FILTERS));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t0 = performance.now();
    const handle = window.setTimeout(() => {
      api
        .search(projectId, q)
        .then((rows) => {
          setResults(rows);
          setSelIdx(0);
          setTiming(Math.round(performance.now() - t0));
        })
        .catch(() => setResults([]));
    }, 120);
    return () => window.clearTimeout(handle);
  }, [query, projectId]);

  const selectedNode = selectedId ? nodesById.get(selectedId) : null;

  const actions: ActionRow[] = [
    ...(selectedNode
      ? [
          {
            id: "open-focus",
            label: `Open "${selectedNode.title}" in Focus mode`,
            shortcut: "↵",
            action: () => { onNavigate("focus", selectedNode.id); onClose(); },
          },
          {
            id: "open-atlas",
            label: `Show neighbourhood of "${selectedNode.title}" in Atlas`,
            shortcut: "⌘↵",
            action: () => { onNavigate("atlas", selectedNode.id); onClose(); },
          },
        ]
      : []),
    {
      id: "new-ingestion",
      label: "New ingestion job from clipboard",
      shortcut: "⌘N",
      action: () => { onNavigate("review"); onClose(); },
    },
  ];

  const nodeResults = results.filter((r) => r.category !== "Source" && r.category !== "Running Log");
  const sourceResults = results.filter((r) => r.category === "Source");

  const flatRows = [
    ...nodeResults.map((r) => ({ kind: "node" as const, data: r })),
    ...sourceResults.map((r) => ({ kind: "source" as const, data: r })),
    ...actions.map((a) => ({ kind: "action" as const, data: a })),
  ];

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      setSelIdx((i) => Math.min(i + 1, flatRows.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      setSelIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const row = flatRows[selIdx];
      if (!row) return;
      if (row.kind === "node" || row.kind === "source") {
        onSelect(row.data.id);
        onNavigate("focus", row.data.id);
        onClose();
      } else if (row.kind === "action") {
        row.data.action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function toggleFilter(f: Filter) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  let rowIndex = 0;

  function ResultRow({ node }: { node: TreeNode }) {
    const idx = rowIndex++;
    return (
      <div
        className={`spotlightRow ${idx === selIdx ? "selected" : ""}`}
        onClick={() => { onSelect(node.id); onNavigate("focus", node.id); onClose(); }}
      >
        <CatPill category={node.category} size="sm" />
        <div className="spotlightRowBody">
          <div className="spotlightRowTitle">{highlightQuery(node.title, query)}</div>
          <div className="spotlightRowMeta">
            {node.status} · {node.importance}
            {node.summary ? ` · ${node.summary.slice(0, 60)}${node.summary.length > 60 ? "…" : ""}` : ""}
          </div>
        </div>
        {idx === selIdx && <span className="spotlightKeyHint">open ↵</span>}
      </div>
    );
  }

  function ActionRow({ action }: { action: ActionRow }) {
    const idx = rowIndex++;
    return (
      <div
        className={`spotlightRow ${idx === selIdx ? "selected" : ""}`}
        onClick={action.action}
      >
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--muted)" }}>›</span>
        <div className="spotlightRowBody">
          <div className="spotlightRowTitle" style={{ fontWeight: 400 }}>{action.label}</div>
        </div>
        <span className="spotlightKeyHint">{action.shortcut}</span>
      </div>
    );
  }

  return (
    <div className="spotlightScrim" onClick={onClose}>
      <div className="spotlightPalette" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="spotlightInput">
          <span style={{ fontSize: 18, color: "var(--muted)", fontFamily: "var(--font-sans)" }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search nodes, details, sources…"
          />
          <div className="spotlightKeyHints">
            <span className="spotlightKeyHint">↑↓</span>
            <span className="spotlightKeyHint">↵</span>
            <span className="spotlightKeyHint">esc</span>
          </div>
        </div>

        {/* Results */}
        <div className="spotlightResults" ref={listRef}>
          {nodeResults.length > 0 && (
            <div className="spotlightSection">
              <div className="spotlightSectionLabel">Nodes · {nodeResults.length}</div>
              {nodeResults.slice(0, 8).map((n) => <ResultRow key={n.id} node={n} />)}
            </div>
          )}

          {sourceResults.length > 0 && (
            <div className="spotlightSection">
              <div className="spotlightSectionLabel">Sources · {sourceResults.length}</div>
              {sourceResults.slice(0, 4).map((n) => <ResultRow key={n.id} node={n} />)}
            </div>
          )}

          {actions.length > 0 && (
            <div className="spotlightSection">
              <div className="spotlightSectionLabel">Actions</div>
              {actions.map((a) => <ActionRow key={a.id} action={a} />)}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div style={{ padding: "20px", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 14 }}>
              No results for "{query}"
            </div>
          )}

          {!query.trim() && (
            <div style={{ padding: "20px" }}>
              <div className="spotlightSectionLabel" style={{ marginBottom: 8 }}>Actions</div>
              {actions.map((a) => <ActionRow key={a.id} action={a} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="spotlightFooter">
          <span>
            filter:{" "}
            {ALL_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: activeFilters.has(f) ? "var(--ink)" : "var(--muted)",
                  padding: "0 4px",
                }}
              >
                {f}
              </button>
            ))}
          </span>
          {results.length > 0 && (
            <span>{results.length} results · {timing}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}
