import type { CandidateGroup, DetailCandidate, EdgeCandidate, NodeCandidate } from "../../types";
import { NodeCandidateCard } from "./NodeCandidateCard";
import { EdgeCandidateCard } from "./EdgeCandidateCard";
import { DetailCandidateCard } from "./DetailCandidateCard";

type NodeDecision = "approved" | "rejected" | "edit" | "pending";
type EdgeDecision = "approved" | "rejected" | "pending";
type DetailDecision = "approved" | "pending";

export type Decisions = {
  nodes: Map<string, NodeDecision>;
  edges: Map<string, EdgeDecision>;
  details: Map<string, DetailDecision>;
};

export function CandidateStack({
  candidates,
  decisions,
  onNodeDecide,
  onEdgeDecide,
  onDetailDecide,
}: {
  candidates: CandidateGroup;
  decisions: Decisions;
  onNodeDecide: (id: string, d: NodeDecision) => void;
  onEdgeDecide: (id: string, d: EdgeDecision) => void;
  onDetailDecide: (id: string, d: DetailDecision) => void;
}) {
  return (
    <div className="reviewCandidateCol">
      {candidates.blocking_errors.length > 0 && (
        <div className="error" style={{ marginBottom: 16 }}>
          {candidates.blocking_errors.join(" · ")}
        </div>
      )}

      {candidates.node_candidates.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p className="monoCap" style={{ marginBottom: 8 }}>
            Node Candidates · {candidates.node_candidates.length}
          </p>
          {candidates.node_candidates.map((c) => (
            <NodeCandidateCard
              key={c.id}
              candidate={c}
              decision={decisions.nodes.get(c.id) ?? "pending"}
              onDecide={(d) => onNodeDecide(c.id, d)}
            />
          ))}
        </section>
      )}

      {candidates.edge_candidates.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p className="monoCap" style={{ marginBottom: 8 }}>
            Edge Candidates · {candidates.edge_candidates.length}
          </p>
          {candidates.edge_candidates.map((c) => (
            <EdgeCandidateCard
              key={c.id}
              candidate={c}
              decision={decisions.edges.get(c.id) ?? "pending"}
              onDecide={(d) => onEdgeDecide(c.id, d)}
            />
          ))}
        </section>
      )}

      {candidates.detail_candidates.length > 0 && (
        <section>
          <p className="monoCap" style={{ marginBottom: 8 }}>
            Detail Blocks · {candidates.detail_candidates.length}
          </p>
          {candidates.detail_candidates.map((c) => (
            <DetailCandidateCard
              key={c.id}
              candidate={c}
              decision={decisions.details.get(c.id) ?? "pending"}
              onDecide={(d) => onDetailDecide(c.id, d)}
            />
          ))}
        </section>
      )}

      {candidates.node_candidates.length === 0 &&
        candidates.edge_candidates.length === 0 &&
        candidates.detail_candidates.length === 0 && (
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 15 }}>
            No candidates found for this job.
          </p>
        )}
    </div>
  );
}
