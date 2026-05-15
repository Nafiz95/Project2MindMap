import { catStyle } from "../../styles/catTokens";
import type { GraphPayload } from "../../types";

export type Lens = "Knowledge" | "Workflow" | "Risk";

// Category subsets for each lens
const LENS_CATEGORIES: Record<Lens, Set<string> | null> = {
  Knowledge: null, // null = show all
  Workflow: new Set(["Experiment", "Implementation", "Running Log", "Method", "Writing", "Grant", "Paper"]),
  Risk: new Set(["Limitation", "Open Question", "Open Questions"]),
};

export function LensRail({
  graph,
  activeLens,
  visibleCategories,
  visibleRelations,
  onLensChange,
  onToggleCategory,
  onToggleRelation,
}: {
  graph: GraphPayload;
  activeLens: Lens;
  visibleCategories: Set<string>;
  visibleRelations: Set<string>;
  onLensChange: (l: Lens) => void;
  onToggleCategory: (cat: string) => void;
  onToggleRelation: (rel: string) => void;
}) {
  const categoryCounts = new Map<string, number>();
  graph.nodes.forEach((n) => categoryCounts.set(n.category, (categoryCounts.get(n.category) ?? 0) + 1));
  const categories = [...categoryCounts.keys()].sort();

  const allRelations = [...new Set(graph.edges.map((e) => e.relation_type))].sort();

  return (
    <div className="atlasLensRail">
      {/* Lens picker */}
      <div className="lensSegment">
        {(["Knowledge", "Workflow", "Risk"] as Lens[]).map((l) => (
          <button
            key={l}
            className={`lensBtn ${l === activeLens ? "active" : ""}`}
            onClick={() => onLensChange(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Categories */}
      <p className="monoCap" style={{ marginBottom: 8 }}>Categories</p>
      {categories.map((cat) => {
        const { fg } = catStyle(cat);
        const on = visibleCategories.has(cat);
        const inLens = LENS_CATEGORIES[activeLens] === null || LENS_CATEGORIES[activeLens]!.has(cat);
        return (
          <div
            key={cat}
            className={`lensCategoryRow ${on ? "" : "off"}`}
            style={{ opacity: inLens ? 1 : 0.4 }}
            onClick={() => onToggleCategory(cat)}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: fg, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11.5 }}>{cat}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>
              {categoryCounts.get(cat)}
            </span>
          </div>
        );
      })}

      {/* Relations */}
      <p className="monoCap" style={{ marginTop: 16, marginBottom: 8 }}>Relations</p>
      {allRelations.map((rel) => {
        const on = visibleRelations.has(rel);
        return (
          <div
            key={rel}
            className={`lensCategoryRow ${on ? "" : "off"}`}
            onClick={() => onToggleRelation(rel)}
          >
            <span style={{ width: 14, height: 1, background: "var(--ink-2)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.3px" }}>
              {rel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { LENS_CATEGORIES };
