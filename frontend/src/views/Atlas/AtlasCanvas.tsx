import { useCallback, useRef, useState } from "react";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import { catStyle } from "../../styles/catTokens";
import { nodeRadius, type SimEdge, type SimNode } from "./useAtlasSimulation";

function bezierMidControl(
  x1: number, y1: number, x2: number, y2: number,
): { cx: number; cy: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const bend = len * 0.08;
  return {
    cx: mx - (dy / len) * bend,
    cy: my + (dx / len) * bend,
  };
}

export function AtlasCanvas({
  nodes,
  edges,
  selectedId,
  hoveredId,
  width,
  height,
  onSelect,
  onHover,
  onDoubleClick,
  onPin,
  onUnpin,
  onZoomChange,
}: {
  nodes: SimNode[];
  edges: SimEdge[];
  selectedId: string | null;
  hoveredId: string | null;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDoubleClick: (id: string) => void;
  onPin: (id: string, x: number, y: number) => void;
  onUnpin: (id: string) => void;
  onZoomChange?: (k: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  // Dimming only activates after the user first interacts with the canvas,
  // so Atlas never opens with nodes already dimmed due to a prior selection.
  const [hasInteracted, setHasInteracted] = useState(false);
  const [transform, setTransform] = [
    useRef({ k: 1, x: 0, y: 0 }),
    useCallback((t: { k: number; x: number; y: number }) => {
      if (gRef.current) {
        gRef.current.setAttribute("transform", `translate(${t.x},${t.y}) scale(${t.k})`);
      }
    }, []),
  ];

  const svgRefCb = useCallback(
    (svg: SVGSVGElement | null) => {
      if (!svg) return;
      (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = svg;
      const z = d3Zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => {
          const t = event.transform;
          transform.current = t;
          setTransform(t);
          onZoomChange?.(t.k);
        });
      select(svg).call(z);
    },
    [setTransform, transform],
  );

  const activeId = hoveredId ?? selectedId;

  // Compute the neighbourhood: activeId + all directly connected node IDs.
  // Only active after first user interaction so Atlas never opens pre-dimmed.
  const neighbourhood = hasInteracted && activeId
    ? new Set<string>(
        edges.reduce<string[]>(
          (acc, e) => {
            if (e.source?.id === activeId && e.target?.id) acc.push(e.target.id);
            if (e.target?.id === activeId && e.source?.id) acc.push(e.source.id);
            return acc;
          },
          [activeId],
        ),
      )
    : null;

  return (
    <svg
      ref={svgRefCb}
      style={{ width: "100%", height: "100%", display: "block", cursor: "grab", background: "var(--paper)" }}
    >
      <g ref={gRef}>
        {/* Edges */}
        {edges.map((edge) => {
          const { source: s, target: t } = edge;
          if (!s || !t) return null;
          const { cx, cy } = bezierMidControl(s.x, s.y, t.x, t.y);
          const isActive = activeId === s.id || activeId === t.id;
          const isDimmed = neighbourhood !== null && !isActive;
          return (
            <g key={edge.id}>
              <path
                d={`M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`}
                fill="none"
                stroke={isActive ? "var(--ink)" : "var(--rule)"}
                strokeWidth={isActive ? 1.2 : 0.8}
                opacity={isDimmed ? 0.1 : isActive ? 0.9 : 0.55}
              />
              {isActive && (
                <text
                  x={cx}
                  y={cy - 4}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fill: "var(--muted)",
                    textAnchor: "middle",
                    pointerEvents: "none",
                  }}
                >
                  {edge.relation_type}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const { fg, bg } = catStyle(node.category);
          const r = nodeRadius(node.importance);
          const isSelected = selectedId === node.id;
          const isHovered = hoveredId === node.id;
          const inNeighbourhood = neighbourhood === null || neighbourhood.has(node.id);
          const isDimmed = neighbourhood !== null && !inNeighbourhood;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              style={{ cursor: "pointer", opacity: isDimmed ? 0.15 : 1, transition: "opacity 0.15s ease" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { setHasInteracted(true); onSelect(node.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node.id); }}
              onMouseEnter={() => { setHasInteracted(true); onHover(node.id); }}
              onMouseLeave={() => onHover(null)}
              onContextMenu={(e) => { e.preventDefault(); onUnpin(node.id); }}
            >
              {node.importance === "high" && (
                <circle
                  r={r + 4}
                  fill="none"
                  stroke={fg}
                  strokeWidth={0.6}
                  strokeDasharray="2 2"
                  opacity={0.4}
                />
              )}
              <circle
                r={r}
                fill={bg}
                stroke={isSelected ? "var(--ink)" : fg}
                strokeWidth={isSelected ? 1.8 : 0.8}
              />
              <text
                y={r + 12}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: Math.max(9, Math.min(11, 10)),
                  fill: isHovered || isSelected ? "var(--ink)" : "var(--ink-2)",
                  fontWeight: isHovered || isSelected ? 600 : 500,
                  textAnchor: "middle",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {node.title.length > 18 ? node.title.slice(0, 17) + "…" : node.title}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
