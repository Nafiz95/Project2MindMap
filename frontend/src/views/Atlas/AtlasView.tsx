import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { GraphPayload, NodeDetail } from "../../types";
import { LensRail, LENS_CATEGORIES, type Lens } from "./LensRail";
import { AtlasCanvas } from "./AtlasCanvas";
import { AtlasHUD } from "./AtlasHUD";
import { AtlasNodeRail } from "./AtlasNodeRail";
import { useAtlasSimulation, type LayoutMode } from "./useAtlasSimulation";

export function AtlasView({
  graph,
  projectId,
  selectedId,
  onSelect,
  onNavigate,
}: {
  graph: GraphPayload;
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNavigate: (view: string, nodeId?: string) => void;
}) {
  const allCategories = new Set(graph.nodes.map((n) => n.category));
  const allRelations  = new Set(graph.edges.map((e) => e.relation_type));

  const [activeLens, setActiveLens] = useState<Lens>("Knowledge");
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(allCategories);
  const [visibleRelations, setVisibleRelations]   = useState<Set<string>>(allRelations);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("cluster");
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply lens preset to visible categories.
  // allCategories is intentionally omitted from deps: the preset should only
  // fire when the user switches lenses, not on every graph data refresh.
  useEffect(() => {
    const preset = LENS_CATEGORIES[activeLens];
    if (preset === null) {
      setVisibleCategories(new Set(allCategories));
    } else {
      setVisibleCategories(new Set([...allCategories].filter((c) => preset.has(c))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLens]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && (rect.width !== dims.w || rect.height !== dims.h)) {
        setDims({ w: rect.width, h: rect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const activeId = hoveredId ?? selectedId;

  useEffect(() => {
    if (!activeId) { setDetail(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDetailLoading(true);
      api
        .nodeDetail(projectId, activeId)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false));
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [activeId, projectId]);

  const { nodes, edges, pinNode, unpinNode } = useAtlasSimulation(
    graph,
    visibleCategories,
    visibleRelations,
    dims.w,
    dims.h,
    layoutMode,
  );

  function handleLensChange(lens: Lens) {
    setActiveLens(lens);
  }

  function toggleCategory(cat: string) {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function toggleRelation(rel: string) {
    setVisibleRelations((prev) => {
      const next = new Set(prev);
      next.has(rel) ? next.delete(rel) : next.add(rel);
      return next;
    });
  }

  return (
    <div className="featureView atlasLayout">
      <LensRail
        graph={graph}
        activeLens={activeLens}
        visibleCategories={visibleCategories}
        visibleRelations={visibleRelations}
        onLensChange={handleLensChange}
        onToggleCategory={toggleCategory}
        onToggleRelation={toggleRelation}
      />

      <div className="atlasCanvas" ref={containerRef}>
        <AtlasCanvas
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          hoveredId={hoveredId}
          width={dims.w}
          height={dims.h}
          onSelect={(id) => { onSelect(id); }}
          onHover={setHoveredId}
          onDoubleClick={(id) => { onSelect(id); onNavigate("focus", id); }}
          onPin={pinNode}
          onUnpin={unpinNode}
          onZoomChange={setZoom}
        />
        <AtlasHUD
          layoutMode={layoutMode}
          zoom={zoom}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          onLayoutChange={setLayoutMode}
          onZoomIn={() => setZoom((z) => Math.min(z * 1.3, 4))}
          onZoomOut={() => setZoom((z) => Math.max(z / 1.3, 0.2))}
        />
      </div>

      <AtlasNodeRail
        nodeDetail={detail}
        graph={graph}
        loading={detailLoading}
        onSelect={(id) => { onSelect(id); }}
        onOpenFocus={(id) => { onSelect(id); onNavigate("focus", id); }}
      />
    </div>
  );
}
