import type { NodeDetail, TreeNode } from "../types";

const EVIDENCE_RELATION_TYPES = new Set([
  "informs", "supports", "extends", "uses",
  "trained_on", "evaluated_on",
]);

export type Suggestion = {
  node: TreeNode;
  reason: string;
  score: number;
};

/**
 * Uncited evidence suggestions for the Outline evidence sidebar.
 *
 * Algorithm:
 * 1. Walk one hop from the current node via evidence-type edges.
 * 2. Drop nodes already cited in the current section.
 * 3. Rank by edge strength (strong=3, medium=2, weak=1) + recency (newer nodes first).
 */
export function computeSuggestions(
  detail: NodeDetail,
  nodesById: Map<string, TreeNode>,
  citedIds: Set<string>,
): Suggestion[] {
  const strengthScore: Record<string, number> = { strong: 3, medium: 2, weak: 1 };
  const results: Suggestion[] = [];

  for (const edge of detail.related_edges) {
    if (!EVIDENCE_RELATION_TYPES.has(edge.relation_type)) continue;
    const neighborId =
      edge.source_node_id === detail.node.id ? edge.target_node_id : edge.source_node_id;
    if (citedIds.has(neighborId) || neighborId === detail.node.id) continue;
    const node = nodesById.get(neighborId);
    if (!node) continue;
    const score = strengthScore[edge.strength] ?? 1;
    results.push({
      node,
      reason: `${edge.relation_type.replace(/_/g, " ")} · linked from this node`,
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.node.id)) return false;
    seen.add(r.node.id);
    return true;
  });
}
