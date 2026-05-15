import { useEffect, useRef, useState } from "react";
import * as d3Force from "d3-force";
import type { GraphPayload } from "../../types";

export type SimNode = {
  id: string;
  title: string;
  category: string;
  status: string;
  importance: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
};

export type SimEdge = {
  id: string;
  source: SimNode;
  target: SimNode;
  relation_type: string;
  strength: string;
};

export type LayoutMode = "cluster" | "force" | "radial";

const CATEGORY_CENTROIDS: Record<string, { x: number; y: number }> = {
  "Root":             { x: 0.5,  y: 0.5  },
  "Clinical Problem": { x: 0.15, y: 0.2  },
  "Dataset":          { x: 0.32, y: 0.12 },
  "Cohort":           { x: 0.48, y: 0.14 },
  "Model":            { x: 0.65, y: 0.12 },
  "Method":           { x: 0.80, y: 0.22 },
  "Experiment":       { x: 0.76, y: 0.48 },
  "Implementation":   { x: 0.72, y: 0.68 },
  "Evaluation":       { x: 0.56, y: 0.75 },
  "Writing":          { x: 0.32, y: 0.72 },
  "Grant":            { x: 0.16, y: 0.65 },
  "Paper":            { x: 0.24, y: 0.58 },
  "Limitation":       { x: 0.12, y: 0.45 },
  "Open Question":    { x: 0.12, y: 0.32 },
  "Open Questions":   { x: 0.12, y: 0.32 },
  "Running Log":      { x: 0.40, y: 0.80 },
  "Source":           { x: 0.50, y: 0.82 },
};

function centroid(cat: string, w: number, h: number): { x: number; y: number } {
  const rel = CATEGORY_CENTROIDS[cat] ?? { x: 0.5, y: 0.5 };
  return { x: rel.x * w, y: rel.y * h };
}

function radialPositions(nodes: SimNode[], w: number, h: number): Map<string, { x: number; y: number }> {
  const byCategory = new Map<string, SimNode[]>();
  nodes.forEach((n) => {
    const arr = byCategory.get(n.category) ?? [];
    arr.push(n);
    byCategory.set(n.category, arr);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const categories = [...byCategory.keys()];
  const numCats = categories.length;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) * 0.38;
  const innerR = Math.min(w, h) * 0.1;

  categories.forEach((cat, ci) => {
    const catAngle = (ci / numCats) * Math.PI * 2 - Math.PI / 2;
    const catX = cx + Math.cos(catAngle) * outerR;
    const catY = cy + Math.sin(catAngle) * outerR;
    const catNodes = byCategory.get(cat) ?? [];
    catNodes.forEach((n, ni) => {
      if (catNodes.length === 1) {
        positions.set(n.id, { x: catX, y: catY });
      } else {
        const nodeAngle = (ni / catNodes.length) * Math.PI * 2;
        positions.set(n.id, {
          x: catX + Math.cos(nodeAngle) * innerR,
          y: catY + Math.sin(nodeAngle) * innerR,
        });
      }
    });
  });
  return positions;
}

export function useAtlasSimulation(
  graph: GraphPayload,
  visibleCategories: Set<string>,
  visibleRelations: Set<string>,
  width: number,
  height: number,
  layoutMode: LayoutMode,
) {
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<SimEdge[]>([]);
  const simRef = useRef<d3Force.Simulation<SimNode, SimEdge> | null>(null);

  useEffect(() => {
    if (!graph || width === 0) return;

    const visNodes: SimNode[] = graph.nodes
      .filter((n) => visibleCategories.has(n.category))
      .map((n) => {
        const c = centroid(n.category, width, height);
        return {
          id: n.id,
          title: n.title,
          category: n.category,
          status: n.status,
          importance: n.importance,
          x: c.x + (Math.random() - 0.5) * 60,
          y: c.y + (Math.random() - 0.5) * 60,
        };
      });

    const nodeIdSet = new Set(visNodes.map((n) => n.id));
    const nodeMap = new Map(visNodes.map((n) => [n.id, n]));

    const visEdges: SimEdge[] = graph.edges
      .filter(
        (e) =>
          visibleRelations.has(e.relation_type) &&
          nodeIdSet.has(e.source_node_id) &&
          nodeIdSet.has(e.target_node_id),
      )
      .map((e) => ({
        id: e.id,
        source: nodeMap.get(e.source_node_id)!,
        target: nodeMap.get(e.target_node_id)!,
        relation_type: e.relation_type,
        strength: e.strength,
      }));

    if (simRef.current) simRef.current.stop();

    if (layoutMode === "radial") {
      // Fixed radial layout — no simulation, pin all nodes
      const positions = radialPositions(visNodes, width, height);
      visNodes.forEach((n) => {
        const pos = positions.get(n.id);
        if (pos) { n.x = pos.x; n.y = pos.y; n.fx = pos.x; n.fy = pos.y; }
      });
      setNodes([...visNodes]);
      setEdges([...visEdges]);
      return;
    }

    // Force strengths differ by mode
    const centroidStrength = layoutMode === "cluster" ? 0.4  : 0.1;
    const chargeStrength   = layoutMode === "cluster" ? -60  : -130;
    const linkDistance     = layoutMode === "cluster" ? 60   : 90;
    const linkStrength     = layoutMode === "cluster" ? 0.15 : 0.35;

    const sim = d3Force
      .forceSimulation<SimNode>(visNodes)
      .force(
        "link",
        d3Force
          .forceLink<SimNode, SimEdge>(visEdges)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(linkStrength),
      )
      .force("charge", d3Force.forceManyBody().strength(chargeStrength))
      .force("collide", d3Force.forceCollide<SimNode>().radius((d) => nodeRadius(d.importance) + 8))
      .force("x", d3Force.forceX<SimNode>((d) => centroid(d.category, width, height).x).strength(centroidStrength))
      .force("y", d3Force.forceY<SimNode>((d) => centroid(d.category, width, height).y).strength(centroidStrength));

    let ticks = 0;
    sim.on("tick", () => {
      ticks++;
      setNodes([...visNodes]);
      setEdges([...visEdges]);
      if (ticks > 200) sim.stop();
    });

    simRef.current = sim;
    return () => { sim.stop(); };
  }, [graph, visibleCategories, visibleRelations, width, height, layoutMode]);

  function pinNode(id: string, x: number, y: number) {
    const n = simRef.current?.nodes().find((node) => node.id === id);
    if (n) { n.fx = x; n.fy = y; simRef.current?.alpha(0.1).restart(); }
  }
  function unpinNode(id: string) {
    const n = simRef.current?.nodes().find((node) => node.id === id);
    if (n) { n.fx = null; n.fy = null; simRef.current?.alpha(0.1).restart(); }
  }

  return { nodes, edges, pinNode, unpinNode };
}

export function nodeRadius(importance: string): number {
  if (importance === "high")   return 26;
  if (importance === "medium") return 18;
  return 13;
}
