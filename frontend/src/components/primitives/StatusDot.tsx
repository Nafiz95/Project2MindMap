const statusColors: Record<string, string> = {
  active:         "oklch(0.65 0.15 145)",
  idea:           "oklch(0.65 0.13 60)",
  paused:         "oklch(0.65 0.06 90)",
  completed:      "oklch(0.55 0.10 250)",
  "needs-review": "oklch(0.65 0.15 25)",
  archived:       "oklch(0.70 0.01 90)",
};

export function StatusDot({ status }: { status: string }) {
  const color = statusColors[status] ?? "oklch(0.70 0.01 90)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.6px",
          color: "var(--muted)",
        }}
      >
        {status}
      </span>
    </span>
  );
}
