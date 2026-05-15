import type { TreeNode } from "../../types";

export function AttentionCards({
  nodes,
  onNavigate,
  onSelect,
}: {
  nodes: TreeNode[];
  onNavigate: (view: string, nodeId?: string) => void;
  onSelect: (id: string) => void;
}) {
  const openQuestions = nodes
    .filter(
      (n) =>
        n.category === "Open Question" &&
        (n.status === "needs-review" || n.status === "active"),
    )
    .slice(0, 4);

  if (openQuestions.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <p className="monoCap" style={{ marginBottom: 10 }}>Needs Your Attention</p>
      {openQuestions.map((node) => (
        <div
          key={node.id}
          className="attentionCard"
          style={{ borderLeftColor: "oklch(0.65 0.13 60)", cursor: "pointer" }}
          onClick={() => { onSelect(node.id); onNavigate("focus", node.id); }}
        >
          <p className="monoCap" style={{ color: "oklch(0.65 0.13 60)", margin: "0 0 4px" }}>OPEN Q.</p>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: "var(--ink)" }}>
            {node.title}
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
            {node.status}
          </p>
        </div>
      ))}
    </div>
  );
}
