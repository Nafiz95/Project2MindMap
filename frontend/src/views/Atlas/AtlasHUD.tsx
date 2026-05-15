type LayoutMode = "cluster" | "force" | "radial";

export function AtlasHUD({
  layoutMode,
  zoom,
  nodeCount,
  edgeCount,
  onLayoutChange,
  onZoomIn,
  onZoomOut,
}: {
  layoutMode: LayoutMode;
  zoom: number;
  nodeCount: number;
  edgeCount: number;
  onLayoutChange: (m: LayoutMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="atlasHUD">
      <div style={{ display: "flex", border: "1px solid var(--rule)", borderRadius: 4, overflow: "hidden" }}>
        {(["cluster", "force", "radial"] as LayoutMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onLayoutChange(m)}
            style={{
              padding: "4px 8px",
              border: "none",
              borderRight: m !== "radial" ? "1px solid var(--rule)" : "none",
              background: layoutMode === m ? "var(--ink)" : "var(--white)",
              color: layoutMode === m ? "var(--white)" : "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={onZoomIn}
        style={{ width: 22, height: 22, border: "1px solid var(--rule)", borderRadius: 3, background: "var(--white)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}
      >⊕</button>
      <button
        onClick={onZoomOut}
        style={{ width: 22, height: 22, border: "1px solid var(--rule)", borderRadius: 3, background: "var(--white)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}
      >⊖</button>

      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>
        {nodeCount}n / {edgeCount}e
      </span>
    </div>
  );
}
