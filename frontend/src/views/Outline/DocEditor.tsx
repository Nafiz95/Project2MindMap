import { useRef, useState } from "react";
import type { DetailBlock, TreeNode } from "../../types";
import { EvidenceChip, parseChips, serialiseChips, type ChipToken } from "./EvidenceChip";
import { OpenIssueBlock } from "./OpenIssueBlock";
import { InlinePicker } from "./InlinePicker";

const BLOCK_ORDER = [
  "overview", "why_it_matters", "technical_details", "current_status",
  "open_questions", "limitations", "next_steps", "related_files",
  "evidence", "implementation_notes", "writing_notes",
];

export function DocEditor({
  blocks,
  activeBlockId,
  allNodes,
  readOnly,
  onFocus,
  onCitedChipsChange,
  onSave,
}: {
  blocks: DetailBlock[];
  activeBlockId: string | null;
  allNodes: TreeNode[];
  readOnly: boolean;
  onFocus: (nodeId: string) => void;
  onCitedChipsChange: (chips: ChipToken[]) => void;
  onSave: (blockId: string, content: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [pickerQuery, setPickerQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sorted = [...blocks].sort((a, b) => {
    const ai = BLOCK_ORDER.indexOf(a.block_type);
    const bi = BLOCK_ORDER.indexOf(b.block_type);
    if (ai !== -1 && bi !== -1) return ai - bi;
    return a.sort_order - b.sort_order;
  });

  function startEdit(block: DetailBlock) {
    if (readOnly) return;
    setEditingId(block.id);
    setDraftContent(block.content);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "@") {
      setPickerQuery("");
    } else if (pickerQuery !== null) {
      if (e.key === "Escape") {
        setPickerQuery(null);
      } else if (e.key !== "Backspace") {
        setPickerQuery((q) => (q ?? "") + e.key);
      } else {
        setPickerQuery((q) => (q && q.length > 0 ? q.slice(0, -1) : null));
      }
    }
  }

  function insertChip(node: TreeNode) {
    const token = `@[${node.id}|${node.title}|${node.category}]`;
    setDraftContent((c) => c + token);
    setPickerQuery(null);
    const chips = parseChips(draftContent + token).filter((p) => typeof p !== "string") as ChipToken[];
    onCitedChipsChange(chips);
  }

  function commitEdit(blockId: string) {
    onSave(blockId, draftContent);
    setEditingId(null);
    const chips = parseChips(draftContent).filter((p) => typeof p !== "string") as ChipToken[];
    onCitedChipsChange(chips);
  }

  const active = sorted.find((b) => b.id === activeBlockId) ?? sorted[0];

  return (
    <div className="outlineDocCol">
      {sorted.map((block, i) => {
        const isActive = activeBlockId === block.id || (!activeBlockId && i === 0);
        const isEditing = editingId === block.id;
        const parts = parseChips(block.content);
        const openQLines = block.block_type === "open_questions"
          ? block.content.split(/\n+/).map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)
          : [];

        if (!isActive) return null;

        return (
          <section key={block.id} style={{ marginBottom: 40 }}>
            <p className="monoCap" style={{ marginBottom: 8 }}>
              {i + 1} · {block.block_type.toUpperCase()}
            </p>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.3px", margin: "0 0 16px", color: "var(--ink)" }}>
              {block.title}
            </h2>

            {/* Open questions render as callout */}
            {block.block_type === "open_questions" ? (
              openQLines.map((line, j) => <OpenIssueBlock key={j} text={line} />)
            ) : isEditing ? (
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  onKeyDown={handleKey}
                  onBlur={() => commitEdit(block.id)}
                  style={{
                    width: "100%",
                    minHeight: 200,
                    fontFamily: "var(--font-serif)",
                    fontSize: 16,
                    lineHeight: 1.65,
                    color: "var(--ink-2)",
                    border: "1px solid var(--rule)",
                    borderRadius: 4,
                    padding: "12px 14px",
                    background: "var(--panel)",
                    resize: "vertical",
                  }}
                  autoFocus
                />
                {pickerQuery !== null && (
                  <div style={{ position: "absolute", top: "100%", left: 0 }}>
                    <InlinePicker
                      query={pickerQuery}
                      nodes={allNodes}
                      onSelect={insertChip}
                      onClose={() => setPickerQuery(null)}
                      anchorRef={textareaRef as React.RefObject<HTMLElement>}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => startEdit(block)}
                style={{ cursor: readOnly ? "default" : "text" }}
              >
                {block.content ? (
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.65, color: "var(--ink-2)", whiteSpace: "pre-wrap", margin: 0 }}>
                    {parts.map((part, pi) =>
                      typeof part === "string" ? (
                        <span key={pi}>{part}</span>
                      ) : (
                        <EvidenceChip
                          key={pi}
                          nodeId={part.nodeId}
                          displayText={part.displayText}
                          category={part.category}
                          onFocus={onFocus}
                        />
                      ),
                    )}
                  </p>
                ) : (
                  <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 15 }}>
                    {readOnly ? "No content." : "Click to write…"}
                  </p>
                )}
              </div>
            )}

            {readOnly && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "oklch(0.65 0.15 25)", marginTop: 8 }}>
                read-only — edits not saved for this database profile
              </p>
            )}
          </section>
        );
      })}

      {sorted.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 16 }}>
          No sections yet. Add detail blocks to this node to see them here.
        </p>
      )}
    </div>
  );
}
