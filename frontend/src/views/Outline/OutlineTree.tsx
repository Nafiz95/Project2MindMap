import type { NodeDetail } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";
import { parseChips } from "./EvidenceChip";

const BLOCK_ORDER = [
  "overview", "why_it_matters", "technical_details", "current_status",
  "open_questions", "limitations", "next_steps", "related_files",
  "evidence", "implementation_notes", "writing_notes",
];

function sortBlocks(detail: NodeDetail) {
  return [...detail.detail_blocks].sort((a, b) => {
    const ai = BLOCK_ORDER.indexOf(a.block_type);
    const bi = BLOCK_ORDER.indexOf(b.block_type);
    if (ai !== -1 && bi !== -1) return ai - bi;
    return a.sort_order - b.sort_order;
  });
}

export function OutlineTree({
  detail,
  activeBlockId,
  onSelectBlock,
}: {
  detail: NodeDetail;
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
}) {
  const node = detail.node;
  const blocks = sortBlocks(detail);

  return (
    <div className="outlineTreeRail">
      <p className="monoCap" style={{ marginBottom: 8 }}>Writing Node</p>
      <CatPill category={node.category} size="sm" />
      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 500, margin: "8px 0 4px", color: "var(--ink)" }}>
        {node.title}
      </h3>

      <p className="monoCap" style={{ marginTop: 20, marginBottom: 8 }}>Sections</p>
      {blocks.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 13 }}>
          No sections yet.
        </p>
      )}
      {blocks.map((block, i) => {
        const chips = parseChips(block.content).filter((p) => typeof p !== "string");
        const isEmpty = !block.content.trim();
        return (
          <div
            key={block.id}
            className={`sectionRow ${activeBlockId === block.id ? "active" : ""}`}
            onClick={() => onSelectBlock(block.id)}
          >
            <span style={{ flex: 1 }}>
              {i + 1}. {block.title || block.block_type}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: isEmpty ? "oklch(0.65 0.15 25)" : "var(--muted)",
              }}
            >
              {isEmpty ? "empty" : chips.length > 0 ? `${chips.length}c` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
