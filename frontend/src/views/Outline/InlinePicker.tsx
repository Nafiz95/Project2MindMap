import { useEffect, useRef, useState } from "react";
import type { TreeNode } from "../../types";
import { CatPill } from "../../components/primitives/CatPill";

export function InlinePicker({
  query,
  nodes,
  onSelect,
  onClose,
  anchorRef,
}: {
  query: string;
  nodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const filtered = nodes
    .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => { setSelIdx(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); if (filtered[selIdx]) onSelect(filtered[selIdx]); }
      if (e.key === "Escape")    { onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selIdx, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="inlinePickerContainer">
      {filtered.map((node, i) => (
        <div
          key={node.id}
          className={`inlinePickerRow ${i === selIdx ? "active" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(node); }}
        >
          <CatPill category={node.category} size="sm" />
          <span>{node.title}</span>
        </div>
      ))}
    </div>
  );
}
