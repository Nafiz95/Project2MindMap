import type { NodeDetail } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";
import { StatusDot } from "../../components/primitives/StatusDot";
import { WRITING_CATEGORIES } from "../../styles/catTokens";

export function ReadingColumn({
  detail,
  onNavigate,
}: {
  detail: NodeDetail;
  onNavigate: (view: string) => void;
}) {
  const node = detail.node;
  const isWriting = WRITING_CATEGORIES.has(node.category);
  const sorted = [...detail.detail_blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="focusReadingCol">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <CatPill category={node.category} size="md" />
        <StatusDot status={node.status} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--muted)" }}>
          {node.importance} importance
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted)", marginLeft: "auto" }}>
          {node.slug}
        </span>
      </div>

      {/* Title */}
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.6px", margin: "0 0 12px", color: "var(--ink)" }}>
        {node.title}
      </h1>

      {/* Aliases */}
      {detail.aliases.length > 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
          also known as · {detail.aliases.join(" · ")}
        </p>
      )}

      {/* Summary lede */}
      {node.summary && (
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, lineHeight: 1.55, fontWeight: 400, color: "var(--ink)", margin: "0 0 28px" }}>
          {node.summary}
        </p>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: "0 0 28px" }} />

      {/* Detail blocks */}
      {sorted.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 16 }}>
          No detail blocks yet.
        </p>
      )}
      {sorted.map((block, i) => (
        <section key={block.id} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.6px", color: "var(--muted)", textTransform: "lowercase" }}>
              §{i + 1} {block.block_type}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--rule-soft)" }} />
          </div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, lineHeight: 1.2, margin: "0 0 8px", color: "var(--ink)" }}>
            {block.title}
          </h3>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.6, margin: 0, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
            {block.content}
          </p>
        </section>
      ))}

      {/* Open in Outline button for Writing/Grant/Paper */}
      {isWriting && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--rule-soft)" }}>
          <button
            onClick={() => onNavigate("outline")}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--accent)",
              background: "none",
              border: "1px solid var(--accent)",
              borderRadius: 4,
              padding: "7px 14px",
              cursor: "pointer",
            }}
          >
            Open in Outline →
          </button>
        </div>
      )}
    </div>
  );
}
