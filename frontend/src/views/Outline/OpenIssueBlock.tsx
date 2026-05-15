export function OpenIssueBlock({ text }: { text: string }) {
  return (
    <div className="openIssueBlock">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="monoCap">Open Issue</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--muted)",
            border: "1px solid var(--rule)",
            borderRadius: 3,
            padding: "1px 5px",
          }}
        >
          pinned
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15.5,
          lineHeight: 1.6,
          fontStyle: "italic",
          color: "var(--muted)",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </p>
    </div>
  );
}
