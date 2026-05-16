import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { NodeDetail, TreeNode } from "../../types";
import { catStyle } from "../../styles/catTokens";
import { computeProgress } from "../../utils/progress";

const ACTIVE_CATEGORIES = new Set(["Experiment", "Writing", "Grant", "Paper"]);

export function ActiveFronts({
  projectId,
  nodes,
  onSelect,
  onNavigate,
}: {
  projectId: string;
  nodes: TreeNode[];
  onSelect: (id: string) => void;
  onNavigate: (view: string, nodeId?: string) => void;
}) {
  const [details, setDetails] = useState<Map<string, NodeDetail>>(new Map());

  const activeNodes = useMemo(
    () => nodes.filter((n) => ACTIVE_CATEGORIES.has(n.category) && n.status === "active").slice(0, 6),
    [nodes],
  );

  useEffect(() => {
    Promise.all(
      activeNodes.map((n) =>
        api.nodeDetail(projectId, n.id).then((d) => [n.id, d] as [string, NodeDetail]),
      ),
    ).then((pairs) => setDetails(new Map(pairs))).catch(() => {});
  }, [projectId, activeNodes]);

  if (activeNodes.length === 0) return null;

  return (
    <div>
      <p className="monoCap" style={{ marginBottom: 10 }}>Active Fronts</p>
      {activeNodes.map((node) => {
        const detail = details.get(node.id);
        const pct = detail ? computeProgress(detail) : 0;
        const { fg } = catStyle(node.category);
        return (
          <div
            key={node.id}
            className="activeFrontRow"
            style={{ cursor: "pointer" }}
            onClick={() => { onSelect(node.id); onNavigate("focus", node.id); }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                {node.title}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>
                {pct}%
              </span>
            </div>
            <div className="progressTrack">
              <div
                className="progressFill"
                style={{ width: `${pct}%`, background: fg, opacity: 0.7 }}
              />
            </div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, color: "var(--muted)", margin: 0 }}>
              {node.status} · {node.category.toLowerCase()}
            </p>
          </div>
        );
      })}
    </div>
  );
}
