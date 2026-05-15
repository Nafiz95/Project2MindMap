import { DecBtn } from "./DecBtn";
import type { EdgeCandidate } from "../../types";

type LocalDecision = "approved" | "rejected" | "pending";

function borderColor(status: LocalDecision): string {
  if (status === "approved") return "oklch(0.65 0.15 145)";
  if (status === "rejected") return "oklch(0.65 0.15 25)";
  return "var(--rule)";
}

export function EdgeCandidateCard({
  candidate,
  decision,
  onDecide,
}: {
  candidate: EdgeCandidate;
  decision: LocalDecision;
  onDecide: (d: LocalDecision) => void;
}) {
  const bc = borderColor(decision);
  const unresolved = !candidate.matched_source_node_id || !candidate.matched_target_node_id;
  return (
    <div className="candidateCard" style={{ borderLeftColor: bc, borderLeftWidth: 3 }}>
      <div className="candidateCardHeader" style={{ gap: 10 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--ink)", flex: 1 }}>
          <strong>{candidate.source}</strong>
          <span style={{ margin: "0 8px", fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", background: "oklch(0.93 0.04 210)", color: "oklch(0.42 0.09 210)", borderRadius: 3 }}>
            {candidate.relation_type}
          </span>
          <strong>{candidate.target}</strong>
          <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>
            · {candidate.strength}
          </span>
        </span>
        <DecBtn label="✓" kind="approve" active={decision === "approved"} onClick={() => onDecide(decision === "approved" ? "pending" : "approved")} />
        <DecBtn label="✕" kind="reject"  active={decision === "rejected"} onClick={() => onDecide(decision === "rejected" ? "pending" : "rejected")} />
      </div>
      {unresolved && (
        <div className="candidateWarning">
          ! One or more endpoints could not be matched to existing nodes.
        </div>
      )}
    </div>
  );
}
