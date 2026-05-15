import type { DetailCandidate } from "../../types";

type LocalDecision = "approved" | "pending";

export function DetailCandidateCard({
  candidate,
  decision,
  onDecide,
}: {
  candidate: DetailCandidate;
  decision: LocalDecision;
  onDecide: (d: LocalDecision) => void;
}) {
  return (
    <div
      className="candidateCard"
      style={{ borderLeftColor: "var(--rule)", borderLeftWidth: 1 }}
    >
      <div className="candidateCardHeader">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {candidate.block_type}
        </span>
        <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
          {candidate.title}
        </span>
        <button
          onClick={() => onDecide(decision === "approved" ? "pending" : "approved")}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.4px",
            color: decision === "approved" ? "oklch(0.55 0.14 145)" : "var(--muted)",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          {decision === "approved" ? "✓ approved" : "pending"}
        </button>
      </div>
      {candidate.content && (
        <div className="candidateCardBody">
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--ink-2)", margin: 0 }}>
            {candidate.content.slice(0, 120)}{candidate.content.length > 120 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
