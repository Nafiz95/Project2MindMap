import type { NodeDetail, TreeNode } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";
import { computeSuggestions } from "../../utils/suggestions";
import type { ChipToken } from "./EvidenceChip";

export function EvidenceSidebar({
  detail,
  nodesById,
  citedChips,
  onInsert,
  onFocus,
}: {
  detail: NodeDetail;
  nodesById: Map<string, TreeNode>;
  citedChips: ChipToken[];
  onInsert: (node: TreeNode) => void;
  onFocus: (id: string) => void;
}) {
  const citedIds = new Set(citedChips.map((c) => c.nodeId));
  const suggestions = computeSuggestions(detail, nodesById, citedIds).slice(0, 5);

  return (
    <div className="outlineEvidenceRail">
      <p className="monoCap" style={{ marginBottom: 10 }}>
        Cited In This Section · {citedChips.length}
      </p>
      {citedChips.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13, color: "var(--muted)" }}>
          No citations yet.
        </p>
      )}
      {citedChips.map((chip, i) => {
        const node = nodesById.get(chip.nodeId);
        return (
          <div key={`${chip.nodeId}-${i}`} className="evidenceChipRow">
            <CatPill category={chip.category} size="sm" />
            <span style={{ flex: 1 }}>{chip.displayText}</span>
            <button
              onClick={() => onFocus(chip.nodeId)}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11 }}
            >
              ↗
            </button>
          </div>
        );
      })}

      {suggestions.length > 0 && (
        <>
          <p className="monoCap" style={{ marginTop: 20, marginBottom: 10 }}>
            Suggested · Uncited
          </p>
          {suggestions.map((s) => (
            <div key={s.node.id} className="evidenceSuggestCard">
              <CatPill category={s.node.category} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink)", marginBottom: 2 }}>
                  {s.node.title}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
                  {s.reason}
                </div>
              </div>
              <button
                onClick={() => onInsert(s.node)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.5px",
                  color: "oklch(0.55 0.14 145)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  whiteSpace: "nowrap",
                }}
              >
                + cite
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
