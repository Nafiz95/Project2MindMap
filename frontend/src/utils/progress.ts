import type { NodeDetail } from "../types";

const STANDARD_BLOCK_TYPES = [
  "overview",
  "why_it_matters",
  "technical_details",
  "current_status",
  "next_steps",
  "evidence",
];

const EVIDENCE_RELATION_TYPES = new Set([
  "informs", "supports", "extends", "uses",
  "trained_on", "evaluated_on",
]);

/**
 * Heuristic progress for Momentum active-fronts strips.
 *
 * Formula: 50% from filled standard block types + 50% from evidence-edge connectivity.
 * A node with all 6 standard blocks AND at least 3 evidence edges scores ~100%.
 * This is a rough proxy; the formula is documented here so it can be tuned later.
 */
export function computeProgress(detail: NodeDetail): number {
  const filledBlocks = STANDARD_BLOCK_TYPES.filter((bt) =>
    detail.detail_blocks.some((b) => b.block_type === bt && b.content.trim().length > 0),
  ).length;
  const blockScore = filledBlocks / STANDARD_BLOCK_TYPES.length;

  const evidenceEdges = detail.related_edges.filter((e) =>
    EVIDENCE_RELATION_TYPES.has(e.relation_type),
  ).length;
  const edgeScore = Math.min(evidenceEdges / 3, 1);

  return Math.round((blockScore * 0.5 + edgeScore * 0.5) * 100);
}
