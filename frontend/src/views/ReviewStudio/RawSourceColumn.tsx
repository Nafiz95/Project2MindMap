import type { CandidateGroup } from "../../types";

function highlightText(text: string, nodeTitles: string[]): string {
  return text;
}

function renderHighlighted(text: string, nodeTitles: string[]): React.ReactNode {
  if (!text) return null;
  let remaining = text;
  const parts: React.ReactNode[] = [];
  let idx = 0;
  for (const title of nodeTitles) {
    const pos = remaining.toLowerCase().indexOf(title.toLowerCase());
    if (pos < 0) continue;
    const before = remaining.slice(0, pos);
    const match = remaining.slice(pos, pos + title.length);
    parts.push(<span key={`b${idx}`}>{before}</span>);
    parts.push(<span key={`m${idx}`} className="rawHighlightNode">{match}</span>);
    remaining = remaining.slice(pos + title.length);
    idx++;
    if (parts.length > 40) break;
  }
  parts.push(<span key="tail">{remaining}</span>);
  return parts;
}

import React from "react";

export function RawSourceColumn({ candidates }: { candidates: CandidateGroup }) {
  const note = (candidates as unknown as { source_note?: string }).source_note ?? "";
  const nodeTitles = candidates.node_candidates.map((n) => n.title);

  const stats = {
    nodes: candidates.node_candidates.length,
    edges: candidates.edge_candidates.length,
    details: candidates.detail_candidates.length,
  };

  return (
    <div className="reviewRawCol">
      <p className="monoCap" style={{ marginBottom: 10 }}>Raw Ingestion</p>
      <div className="rawQuoteBlock">
        {note
          ? renderHighlighted(note, nodeTitles)
          : <em style={{ color: "var(--muted)" }}>No raw note available for this job.</em>}
      </div>

      <p className="monoCap" style={{ marginTop: 20, marginBottom: 8 }}>Extractor Found</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Chip label={`${stats.nodes} nodes`}    bg="oklch(0.93 0.04 250)" fg="oklch(0.42 0.10 250)" />
        <Chip label={`${stats.edges} edges`}    bg="oklch(0.93 0.04 165)" fg="oklch(0.42 0.10 165)" />
        <Chip label={`${stats.details} details`} bg="oklch(0.93 0.04 295)" fg="oklch(0.42 0.10 295)" />
      </div>
    </div>
  );
}

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.5px",
        padding: "3px 8px",
        borderRadius: 3,
      }}
    >
      {label}
    </span>
  );
}
