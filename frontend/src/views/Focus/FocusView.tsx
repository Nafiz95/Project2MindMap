import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { NodeDetail, TreeNode } from "../../types";
import { SkeletonBlock } from "../../components/primitives/SkeletonBlock";
import { BreadcrumbRail } from "./BreadcrumbRail";
import { ReadingColumn } from "./ReadingColumn";
import { ConnectionsRail } from "./ConnectionsRail";

export function FocusView({
  projectId,
  nodeId,
  nodesById,
  onSelect,
  onNavigate,
}: {
  projectId: string;
  nodeId: string;
  nodesById: Map<string, TreeNode>;
  onSelect: (id: string) => void;
  onNavigate: (view: string) => void;
}) {
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .nodeDetail(projectId, nodeId)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load node"))
      .finally(() => setLoading(false));
  }, [projectId, nodeId]);

  if (loading) {
    return (
      <div className="featureView focusLayout">
        <div className="focusBreadcrumbRail">
          <SkeletonBlock height="14px" width="80px" />
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {[100, 160, 130].map((w, i) => <SkeletonBlock key={i} height="18px" width={`${w}px`} />)}
          </div>
        </div>
        <div className="focusReadingCol">
          <SkeletonBlock height="48px" width="70%" />
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <SkeletonBlock height="18px" />
            <SkeletonBlock height="18px" width="85%" />
            <SkeletonBlock height="18px" width="90%" />
          </div>
        </div>
        <div className="focusConnectionsRail">
          <SkeletonBlock height="14px" width="80px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="featureView" style={{ padding: 40 }}>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="featureView" style={{ padding: 40 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
          Select a node to read it here.
        </p>
      </div>
    );
  }

  return (
    <div className="featureView focusLayout">
      <BreadcrumbRail nodeId={nodeId} nodesById={nodesById} onSelect={onSelect} />
      <ReadingColumn detail={detail} onNavigate={onNavigate} />
      <ConnectionsRail detail={detail} onSelect={onSelect} />
    </div>
  );
}
