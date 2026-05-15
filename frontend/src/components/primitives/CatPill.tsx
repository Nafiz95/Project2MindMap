import { catStyle } from "../../styles/catTokens";

export function CatPill({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { fg, bg } = catStyle(category);
  const pad = size === "sm" ? "2px 5px" : "3px 8px";
  const fs = size === "sm" ? 9 : 10;
  const dotSize = size === "sm" ? 5 : 6;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: bg,
        color: fg,
        fontFamily: "var(--font-mono)",
        fontSize: fs,
        fontWeight: 500,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        padding: pad,
        borderRadius: "var(--r-pill)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: fg,
          flexShrink: 0,
        }}
      />
      {category}
    </span>
  );
}
