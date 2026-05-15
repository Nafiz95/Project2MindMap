import { CatPill } from "../../components/primitives/CatPill";
import { DecBtn } from "./DecBtn";
import type { NodeCandidate } from "../../types";

type LocalDecision = "approved" | "rejected" | "edit" | "pending";

function borderColor(status: LocalDecision | string): string {
  if (status === "approved") return "oklch(0.65 0.15 145)";
  if (status === "edit")     return "oklch(0.78 0.13 60)";
  if (status === "rejected") return "oklch(0.65 0.15 25)";
  return "var(--rule)";
}

export function NodeCandidateCard({
  candidate,
  decision,
  onDecide,
}: {
  candidate: NodeCandidate;
  decision: LocalDecision;
  onDecide: (d: LocalDecision) => void;
}) {
  const bc = borderColor(decision);
  return (
    <div
      className="candidateCard"
      style={{ borderLeftColor: bc, borderLeftWidth: 3 }}
    >
      <div className="candidateCardHeader">
        <CatPill category={candidate.category} size="sm" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--muted)",
            flex: 1,
          }}
        >
          {candidate.action === "create"
            ? "new node"
            : `update · ${candidate.matched_existing_node_id ?? "?"}`}
        </span>
        <DecBtn label="✓" kind="approve" active={decision === "approved"} onClick={() => onDecide(decision === "approved" ? "pending" : "approved")} />
        <DecBtn label="✎" kind="edit"    active={decision === "edit"}     onClick={() => onDecide(decision === "edit"     ? "pending" : "edit")} />
        <DecBtn label="✕" kind="reject"  active={decision === "rejected"} onClick={() => onDecide(decision === "rejected" ? "pending" : "rejected")} />
      </div>
      <div className="candidateCardBody">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
          {candidate.title}
        </div>
        {candidate.summary && (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.45, color: "var(--ink-2)" }}>
            {candidate.summary}
          </div>
        )}
      </div>
    </div>
  );
}
