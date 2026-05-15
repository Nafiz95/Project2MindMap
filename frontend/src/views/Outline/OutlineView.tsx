import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { NodeDetail, TreeNode } from "../../types";
import { SkeletonBlock } from "../../components/primitives/SkeletonBlock";
import { OutlineTree } from "./OutlineTree";
import { DocEditor } from "./DocEditor";
import { EvidenceSidebar } from "./EvidenceSidebar";
import { parseChips, type ChipToken } from "./EvidenceChip";
import { WRITING_CATEGORIES } from "../../styles/catTokens";

export function OutlineView({
  projectId,
  nodeId,
  nodesById,
  onNavigate,
  isWikiProfile,
}: {
  projectId: string;
  nodeId: string;
  nodesById: Map<string, TreeNode>;
  onNavigate: (view: string, nodeId?: string) => void;
  isWikiProfile: boolean;
}) {
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [citedChips, setCitedChips] = useState<ChipToken[]>([]);

  useEffect(() => {
    setLoading(true);
    api
      .nodeDetail(projectId, nodeId)
      .then((d) => {
        setDetail(d);
        const firstBlock = d.detail_blocks[0];
        if (firstBlock) {
          setActiveBlockId(firstBlock.id);
          const chips = parseChips(firstBlock.content).filter((p) => typeof p !== "string") as ChipToken[];
          setCitedChips(chips);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [projectId, nodeId]);

  async function handleSave(blockId: string, content: string) {
    if (isWikiProfile) return;
    try {
      await api.patchCandidate("details", blockId, { content } as Record<string, unknown>);
      setDetail((d) => {
        if (!d) return d;
        return {
          ...d,
          detail_blocks: d.detail_blocks.map((b) => (b.id === blockId ? { ...b, content } : b)),
        };
      });
    } catch {
      // silently fail on wiki profile
    }
  }

  if (loading) {
    return (
      <div className="featureView outlineLayout">
        <div className="outlineTreeRail"><SkeletonBlock height="120px" /></div>
        <div className="outlineDocCol"><SkeletonBlock height="200px" /></div>
        <div className="outlineEvidenceRail"><SkeletonBlock height="80px" /></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="featureView" style={{ padding: 40 }}>
        <div className="error">{error ?? "Node not found."}</div>
      </div>
    );
  }

  if (!WRITING_CATEGORIES.has(detail.node.category)) {
    return (
      <div className="featureView" style={{ padding: 40 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
          Outline is only available for Writing, Grant, and Paper nodes.
        </p>
      </div>
    );
  }

  const allNodes = [...nodesById.values()];

  return (
    <div className="featureView outlineLayout">
      <OutlineTree
        detail={detail}
        activeBlockId={activeBlockId}
        onSelectBlock={(id) => {
          setActiveBlockId(id);
          const block = detail.detail_blocks.find((b) => b.id === id);
          if (block) {
            const chips = parseChips(block.content).filter((p) => typeof p !== "string") as ChipToken[];
            setCitedChips(chips);
          }
        }}
      />
      <DocEditor
        blocks={detail.detail_blocks}
        activeBlockId={activeBlockId}
        allNodes={allNodes}
        readOnly={isWikiProfile}
        onFocus={(id) => { onNavigate("focus", id); }}
        onCitedChipsChange={setCitedChips}
        onSave={handleSave}
      />
      <EvidenceSidebar
        detail={detail}
        nodesById={nodesById}
        citedChips={citedChips}
        onInsert={(node) => {
          const block = detail.detail_blocks.find((b) => b.id === activeBlockId);
          if (!block || isWikiProfile) return;
          const token = `@[${node.id}|${node.title}|${node.category}]`;
          handleSave(block.id, block.content + " " + token);
          setCitedChips((prev) => [...prev, { nodeId: node.id, displayText: node.title, category: node.category }]);
        }}
        onFocus={(id) => onNavigate("focus", id)}
      />
    </div>
  );
}
