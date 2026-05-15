import { useEffect, useReducer, useState } from "react";
import { api } from "../../api/client";
import type { CandidateGroup } from "../../types";
import { SkeletonBlock } from "../../components/primitives/SkeletonBlock";
import { RawSourceColumn } from "./RawSourceColumn";
import { CandidateStack, type Decisions } from "./CandidateStack";

type NodeDecision = "approved" | "rejected" | "edit" | "pending";
type EdgeDecision = "approved" | "rejected" | "pending";
type DetailDecision = "approved" | "pending";

type State = Decisions;

type Action =
  | { type: "node"; id: string; d: NodeDecision }
  | { type: "edge"; id: string; d: EdgeDecision }
  | { type: "detail"; id: string; d: DetailDecision }
  | { type: "reset"; candidates: CandidateGroup };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "node": {
      const next = new Map(state.nodes);
      next.set(action.id, action.d);
      return { ...state, nodes: next };
    }
    case "edge": {
      const next = new Map(state.edges);
      next.set(action.id, action.d);
      return { ...state, edges: next };
    }
    case "detail": {
      const next = new Map(state.details);
      next.set(action.id, action.d);
      return { ...state, details: next };
    }
    case "reset":
      return {
        nodes: new Map(action.candidates.node_candidates.map((c) => [c.id, c.review_status === "approved" ? "approved" : "pending"])),
        edges: new Map(action.candidates.edge_candidates.map((c) => [c.id, c.review_status === "approved" ? "approved" : "pending"])),
        details: new Map(action.candidates.detail_candidates.map((c) => [c.id, c.review_status === "approved" ? "approved" : "pending"])),
      };
    default:
      return state;
  }
}

function jobIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("job");
}

export function ReviewStudioView({
  onNavigate,
  onToast,
}: {
  onNavigate: (view: string) => void;
  onToast: (msg: string) => void;
}) {
  const jobId = jobIdFromUrl();
  const [candidates, setCandidates] = useState<CandidateGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [decisions, dispatch] = useReducer(reducer, {
    nodes: new Map(),
    edges: new Map(),
    details: new Map(),
  });

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    api
      .candidates(jobId)
      .then((data) => {
        setCandidates(data);
        dispatch({ type: "reset", candidates: data });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load candidates"))
      .finally(() => setLoading(false));
  }, [jobId]);

  const pendingCount = candidates
    ? [...decisions.nodes.values()].filter((d) => d === "pending").length +
      [...decisions.edges.values()].filter((d) => d === "pending").length +
      [...decisions.details.values()].filter((d) => d === "pending").length
    : 0;

  const approvedCount = candidates
    ? [...decisions.nodes.values()].filter((d) => d === "approved").length +
      [...decisions.edges.values()].filter((d) => d === "approved").length +
      [...decisions.details.values()].filter((d) => d === "approved").length
    : 0;

  const totalCount = candidates
    ? candidates.node_candidates.length + candidates.edge_candidates.length + candidates.detail_candidates.length
    : 0;

  async function handleCommit() {
    if (!jobId || !candidates) return;
    setCommitting(true);
    try {
      for (const [id, d] of decisions.nodes) {
        if (d !== "pending") {
          await api.patchCandidate("nodes", id, { review_status: d === "edit" ? "needs-review" : d });
        }
      }
      for (const [id, d] of decisions.edges) {
        if (d !== "pending") {
          await api.patchCandidate("edges", id, { review_status: d });
        }
      }
      for (const [id, d] of decisions.details) {
        if (d !== "pending") {
          await api.patchCandidate("details", id, { review_status: d });
        }
      }
      await api.commit(jobId);
      onToast(`Committed ${approvedCount} candidates.`);
      onNavigate("momentum");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  }

  async function handleReject() {
    if (!jobId) return;
    try {
      await api.reject(jobId);
      onNavigate("momentum");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  if (!jobId) {
    return (
      <div className="featureView" style={{ padding: 56 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 16 }}>
          No ingestion job pending. Drop a chat or note into Spotlight (⌘N) to create one.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="featureView" style={{ padding: 32, display: "grid", gap: 12 }}>
        <SkeletonBlock height="60px" />
        <SkeletonBlock height="40px" />
        <SkeletonBlock height="40px" />
        <SkeletonBlock height="40px" />
      </div>
    );
  }

  return (
    <div className="featureView reviewLayout">
      {/* Job header */}
      <div className="reviewJobHeader">
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}>
            {(candidates as unknown as { source_title?: string })?.source_title ?? jobId}
          </div>
          <div className="monoCap" style={{ marginTop: 4 }}>
            {jobId} · {totalCount} candidates total
          </div>
        </div>

        <div className="statusPill">
          {approvedCount} of {totalCount} approved · {pendingCount} pending
        </div>

        {error && <span style={{ color: "oklch(0.65 0.15 25)", fontSize: 12, fontFamily: "var(--font-sans)" }}>{error}</span>}

        <button
          style={{ border: "1px solid var(--rule)", background: "var(--white)", borderRadius: 4, padding: "7px 14px", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13 }}
          onClick={handleReject}
        >
          Reject job
        </button>

        <button
          className="reviewCommitBtn"
          disabled={committing || !candidates || pendingCount > 0 || (candidates?.blocking_errors.length ?? 0) > 0}
          onClick={handleCommit}
        >
          {committing ? "Committing…" : `Commit ${approvedCount} approved →`}
        </button>
      </div>

      {/* Columns */}
      <div className="reviewColumns">
        {candidates && <RawSourceColumn candidates={candidates} />}
        {candidates && (
          <CandidateStack
            candidates={candidates}
            decisions={decisions}
            onNodeDecide={(id, d) => dispatch({ type: "node", id, d })}
            onEdgeDecide={(id, d) => dispatch({ type: "edge", id, d })}
            onDetailDecide={(id, d) => dispatch({ type: "detail", id, d })}
          />
        )}
      </div>
    </div>
  );
}
