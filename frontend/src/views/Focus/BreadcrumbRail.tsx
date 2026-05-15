import type { TreeNode } from "../../types";

function buildCrumbs(nodeId: string, nodesById: Map<string, TreeNode>): TreeNode[] {
  const crumbs: TreeNode[] = [];
  let current = nodesById.get(nodeId);
  while (current) {
    crumbs.unshift(current);
    current = current.parent_id ? nodesById.get(current.parent_id) : undefined;
  }
  return crumbs;
}

export function BreadcrumbRail({
  nodeId,
  nodesById,
  onSelect,
}: {
  nodeId: string;
  nodesById: Map<string, TreeNode>;
  onSelect: (id: string) => void;
}) {
  const crumbs = buildCrumbs(nodeId, nodesById);
  const current = nodesById.get(nodeId);
  const siblings = current?.parent_id
    ? (nodesById.get(current.parent_id)?.child_ids ?? [])
        .map((id) => nodesById.get(id))
        .filter((n): n is TreeNode => n !== undefined && n.id !== nodeId)
    : [];

  return (
    <div className="focusBreadcrumbRail">
      <p className="monoCap" style={{ marginBottom: 10 }}>You Are Here</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {crumbs.map((node, i) => (
          <button
            key={node.id}
            className={`breadcrumbItem ${node.id === nodeId ? "current" : ""}`}
            style={{ paddingLeft: 4 + i * 14 }}
            onClick={() => onSelect(node.id)}
          >
            {node.title}
          </button>
        ))}
      </div>

      {siblings.length > 0 && (
        <>
          <p className="monoCap" style={{ marginTop: 20, marginBottom: 8 }}>
            Siblings · {current?.category ?? ""}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {siblings.slice(0, 10).map((n) => (
              <button
                key={n.id}
                className="breadcrumbItem"
                onClick={() => onSelect(n.id)}
                style={{ color: "var(--muted)" }}
              >
                {n.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
