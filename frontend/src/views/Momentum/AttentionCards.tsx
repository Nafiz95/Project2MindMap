import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { DashboardPayload, IngestionJobSummary, TreeNode } from "../../types";

const STALE_DAYS = 30;

export function AttentionCards({
  nodes,
  dashboard,
  projectId,
  onNavigate,
  onSelect,
}: {
  nodes: TreeNode[];
  dashboard: DashboardPayload | null;
  projectId: string;
  onNavigate: (view: string, nodeId?: string) => void;
  onSelect: (id: string) => void;
}) {
  const [jobs, setJobs] = useState<IngestionJobSummary[]>([]);

  useEffect(() => {
    api.listJobs(projectId).then(setJobs).catch(() => setJobs([]));
  }, [projectId]);

  const pendingJobs = jobs.filter((j) => j.status === "pending");

  const openQuestions = nodes
    .filter(
      (n) =>
        n.category === "Open Question" &&
        (n.status === "needs-review" || n.status === "active"),
    )
    .slice(0, 3);

  const staleNodes = nodes
    .filter((n) => {
      if (n.status !== "active") return false;
      if (n.importance === "low") return false;
      return false;
    })
    .slice(0, 2);

  const cards: Array<{ id: string; accentColor: string; label: string; title: string; sub: string; onClick: () => void }> = [];

  if (pendingJobs.length > 0) {
    const job = pendingJobs[0];
    const total = Object.values(job.candidate_counts ?? {}).reduce((a, b) => a + b, 0);
    cards.push({
      id: "ingestion",
      accentColor: "oklch(0.78 0.12 80)",
      label: "INGESTION",
      title: `${pendingJobs.length} ${pendingJobs.length === 1 ? "job" : "jobs"} pending review`,
      sub: `${job.job_id} · ${total} candidates`,
      onClick: () => {
        const params = new URLSearchParams(window.location.search);
        params.set("job", job.job_id);
        window.history.replaceState(null, "", `?${params.toString()}`);
        onNavigate("review");
      },
    });
  }

  for (const node of openQuestions) {
    cards.push({
      id: `oq-${node.id}`,
      accentColor: "oklch(0.65 0.13 60)",
      label: "OPEN Q.",
      title: node.title,
      sub: node.status,
      onClick: () => { onSelect(node.id); onNavigate("focus", node.id); },
    });
  }

  if (cards.length === 0 && nodes.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Nothing needs attention right now.
      </p>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <p className="monoCap" style={{ marginBottom: 10 }}>Needs Your Attention</p>
      {cards.slice(0, 4).map((card) => (
        <div
          key={card.id}
          className="attentionCard"
          style={{ borderLeftColor: card.accentColor }}
          onClick={card.onClick}
        >
          <p className="monoCap" style={{ color: card.accentColor, margin: "0 0 4px" }}>{card.label}</p>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: "var(--ink)" }}>
            {card.title}
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
            {card.sub}
          </p>
        </div>
      ))}
      {cards.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 14 }}>
          Nothing needs attention.
        </p>
      )}
    </div>
  );
}
