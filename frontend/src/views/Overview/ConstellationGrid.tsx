import type { TreeNode, TreePayload } from "../../types";
import { catStyle } from "../../styles/catTokens";

const CHILD_PREVIEW = 7;

function treeRoots(tree: TreePayload): string[] {
  return tree.root_ids?.length ? tree.root_ids : tree.root_id ? [tree.root_id] : [];
}

export function ConstellationGrid({
  tree,
  nodesById,
  filteredIds,
  hasActiveFilter,
  onSelect,
}: {
  tree: TreePayload;
  nodesById: Map<string, TreeNode>;
  filteredIds: Set<string>;
  hasActiveFilter: boolean;
  onSelect: (id: string) => void;
}) {
  const roots = treeRoots(tree).map((id) => nodesById.get(id)).filter(Boolean) as TreeNode[];

  // If single root, show its children as cards (one level deeper — the branches)
  const cards: TreeNode[] =
    roots.length === 1 && roots[0].child_ids.length > 0
      ? (roots[0].child_ids.map((id) => nodesById.get(id)).filter(Boolean) as TreeNode[])
      : roots;

  const visibleCards = hasActiveFilter
    ? cards.filter((c) => {
        if (filteredIds.has(c.id)) return true;
        return c.child_ids.some((id) => filteredIds.has(id));
      })
    : cards;

  if (!visibleCards.length) {
    return (
      <div className="constellationEmpty">
        <p>No branches match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="constellationGrid">
      {visibleCards.map((card) => (
        <ConstellationCard
          key={card.id}
          node={card}
          nodesById={nodesById}
          filteredIds={filteredIds}
          hasActiveFilter={hasActiveFilter}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ConstellationCard({
  node,
  nodesById,
  filteredIds,
  hasActiveFilter,
  onSelect,
}: {
  node: TreeNode;
  nodesById: Map<string, TreeNode>;
  filteredIds: Set<string>;
  hasActiveFilter: boolean;
  onSelect: (id: string) => void;
}) {
  const children = node.child_ids
    .map((id) => nodesById.get(id))
    .filter(Boolean) as TreeNode[];

  const preview = children.slice(0, CHILD_PREVIEW);
  const overflow = children.length - CHILD_PREVIEW;
  const style = catStyle(node.category);

  return (
    <article
      className="constellationCard"
      style={{ borderTopColor: style.fg }}
      onClick={() => onSelect(node.id)}
    >
      {/* Card header */}
      <div className="constellationCardHead">
        <span className="constellationCatLabel" style={{ color: style.fg }}>
          {node.category}
        </span>
        <span className="constellationCount">{children.length} nodes</span>
      </div>

      {/* Title */}
      <h3 className="constellationTitle">{node.title}</h3>

      {/* Summary */}
      {node.summary && (
        <p className="constellationSummary">{node.summary}</p>
      )}

      {/* Children list */}
      {preview.length > 0 && (
        <ul className="constellationChildren">
          {preview.map((child) => {
            const childStyle = catStyle(child.category);
            const isMatch = filteredIds.has(child.id);
            const dimmed = hasActiveFilter && !isMatch;
            return (
              <li
                key={child.id}
                className={`constellationChild${dimmed ? " dimmed" : ""}${isMatch && hasActiveFilter ? " matched" : ""}`}
                onClick={(e) => { e.stopPropagation(); onSelect(child.id); }}
              >
                <span
                  className="constellationChildDot"
                  style={{ background: childStyle.fg }}
                />
                <span className="constellationChildTitle">{child.title}</span>
                <span
                  className="constellationChildCat"
                  style={{ color: childStyle.fg, background: childStyle.bg }}
                >
                  {child.category}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      <div className="constellationCardFoot">
        {overflow > 0 && (
          <span className="constellationOverflow">+{overflow} more</span>
        )}
        <span className="constellationOpenHint">open in focus →</span>
      </div>
    </article>
  );
}
