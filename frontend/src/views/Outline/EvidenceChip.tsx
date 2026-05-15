import { useState } from "react";
import { catStyle } from "../../styles/catTokens";

export function EvidenceChip({
  nodeId,
  displayText,
  category,
  summary,
  onFocus,
}: {
  nodeId: string;
  displayText: string;
  category: string;
  summary?: string | null;
  onFocus: (id: string) => void;
}) {
  const [showTip, setShowTip] = useState(false);
  const { fg, bg } = catStyle(category);

  return (
    <span
      className="evidenceChipInline"
      style={{ background: bg, color: fg, borderBottomColor: fg }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={() => onFocus(nodeId)}
      title={summary ?? undefined}
    >
      {displayText}
      {showTip && summary && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 100,
            background: "var(--ink)",
            color: "var(--white)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 4,
            whiteSpace: "pre-wrap" as "pre-wrap",
            maxWidth: 280,
            pointerEvents: "none",
          }}
        >
          {summary.slice(0, 120)}
        </span>
      )}
    </span>
  );
}

// @[nodeId|Display Text|category] serialisation helpers
export type ChipToken = { nodeId: string; displayText: string; category: string };
const CHIP_RE = /@\[([^\]|]+)\|([^\]|]+)\|([^\]]+)\]/g;

export function parseChips(text: string): Array<string | ChipToken> {
  const parts: Array<string | ChipToken> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  CHIP_RE.lastIndex = 0;
  while ((match = CHIP_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ nodeId: match[1], displayText: match[2], category: match[3] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function serialiseChips(parts: Array<string | ChipToken>): string {
  return parts
    .map((p) => (typeof p === "string" ? p : `@[${p.nodeId}|${p.displayText}|${p.category}]`))
    .join("");
}
