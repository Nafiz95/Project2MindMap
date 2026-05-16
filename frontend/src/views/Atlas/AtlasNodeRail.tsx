import type { NodeDetail, GraphPayload } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";
import { StatusDot } from "../../components/primitives/StatusDot";
import { SkeletonBlock } from "../../components/primitives/SkeletonBlock";

export function AtlasNodeRail({
  nodeDetail,
  graph,
  loading,
  onSelect,
  onOpenFocus,
}: {
  nodeDetail: NodeDetail | null;
  graph: GraphPayload;
  loading: boolean;
  onSelect: (id: string) => void;
  onOpenFocus: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="atlasNodeRail">
        <SkeletonBlock height="22px" width="70%" />
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <SkeletonBlock height="14px" />
          <SkeletonBlock height="14px" width="80%" />
        </div>
      </div>
    );
  }

  if (!nodeDetail) {
    return (
      <div className="atlasNodeRail">
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 13 }}>
          Hover or click a node to inspect it.
        </p>
      </div>
    );
  }

  const node = nodeDetail.node;
  const neighbours = nodeDetail.related_edges.slice(0, 12);

  return (
    <div className="atlasNodeRail">
      <CatPill category={node.category} size="md" />
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.2px", margin: "10px 0 4px", color: "var(--ink)" }}>
        {node.title}
      </h2>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px" }}>
        {node.slug}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <StatusDot status={node.status} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.4px" }}>
          · {node.importance} importance
        </span>
      </div>
      {node.summary && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)", margin: "0 0 16px" }}>
          {node.summary}
        </p>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: "0 0 14px" }} />

      {neighbours.length > 0 && (
        <>
          <p className="monoCap" style={{ marginBottom: 8 }}>Neighbours</p>
          {neighbours.map((edge) => {
            const isSource = edge.source_node_id === node.id;
            const neighborId = isSource ? edge.target_node_id : edge.source_node_id;
            const neighbor = nodeDetail.related_nodes.find((n) => n.id === neighborId);
            return (
              <div key={edge.id} className="atlasNeighbourRow">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", paddingTop: 2 }}>
                  {edge.relation_type}
                </span>
                <button
                  onClick={() => onSelect(neighborId)}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11.5,
                    color: "var(--ink)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline dotted var(--rule)",
                    textAlign: "left",
                  }}
                >
                  {neighbor?.title ?? neighborId}
                </button>
              </div>
            );
          })}
        </>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--rule-soft)" }}>
        {nodeDetail.sources.length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", margin: "0 0 4px" }}>
            sources · {nodeDetail.sources.length}
          </p>
        )}
        {nodeDetail.tags.length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", margin: "0 0 12px" }}>
            tags · {nodeDetail.tags.slice(0, 5).join(", ")}
          </p>
        )}
        <button
          onClick={() => onOpenFocus(node.id)}
          style={{
            marginTop: 4,
            width: "100%",
            padding: "7px 0",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--paper)",
            background: "var(--ink)",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Open in Focus →
        </button>
      </div>
    </div>
  );
}
