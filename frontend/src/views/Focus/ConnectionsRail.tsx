import type { NodeDetail } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";

export function ConnectionsRail({
  detail,
  onSelect,
}: {
  detail: NodeDetail;
  onSelect: (id: string) => void;
}) {
  const openQuestionBlocks = detail.detail_blocks.filter(
    (b) => b.block_type === "open_questions" && b.content.trim(),
  );
  const openQuestionLines = openQuestionBlocks.flatMap((b) =>
    b.content
      .split(/\n+/)
      .map((l) => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean),
  );

  return (
    <div className="focusConnectionsRail">
      {/* Connections */}
      <p className="monoCap" style={{ marginBottom: 10 }}>
        Connections · {detail.related_edges.length}
      </p>
      {detail.related_edges.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13, color: "var(--muted)" }}>
          No connections.
        </p>
      )}
      {detail.related_edges.slice(0, 20).map((edge) => {
        const isSource = edge.source_node_id === detail.node.id;
        const neighborId = isSource ? edge.target_node_id : edge.source_node_id;
        const neighbor = detail.related_nodes.find((n) => n.id === neighborId);
        return (
          <div key={edge.id} className="connectionRow">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--muted)", paddingTop: 2 }}>
              {edge.relation_type}
            </span>
            <div>
              <button
                onClick={() => onSelect(neighborId)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline dotted var(--rule)",
                  textAlign: "left",
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {neighbor?.title ?? neighborId}
              </button>
              {neighbor && <CatPill category={neighbor.category} size="sm" />}
            </div>
          </div>
        );
      })}

      {/* Sources */}
      {detail.sources.length > 0 && (
        <>
          <p className="monoCap" style={{ marginTop: 20, marginBottom: 8 }}>Sources</p>
          {detail.sources.map((src) => (
            <div key={src.id} className="sourceRow">
              {src.path_or_url ? (
                <a
                  href={src.path_or_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--ink-2)", textDecoration: "none" }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
                    [{src.source_type}]
                  </span>{" "}
                  {src.title}
                </a>
              ) : (
                <>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
                    [{src.source_type}]
                  </span>{" "}
                  {src.title}
                </>
              )}
            </div>
          ))}
        </>
      )}

      {/* Open Questions */}
      {openQuestionLines.length > 0 && (
        <>
          <p className="monoCap" style={{ marginTop: 20, marginBottom: 8 }}>
            Open Questions · {openQuestionLines.length}
          </p>
          {openQuestionLines.map((line, i) => (
            <div key={i} className="openQuestionChip">{line}</div>
          ))}
        </>
      )}
    </div>
  );
}
