const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function MomentumHeader({
  weekNumber,
  weekStart,
  weekEnd,
  recentCount,
}: {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  recentCount: number;
}) {
  return (
    <div className="momentumHeader">
      <p className="monoCap" style={{ margin: "0 0 8px" }}>
        Week {weekNumber} · {fmt(weekStart)} → {fmt(weekEnd)} · {weekStart.getFullYear()}
      </p>
      <p style={{
        fontFamily: "var(--font-serif)",
        fontSize: 32,
        fontWeight: 500,
        letterSpacing: "-0.4px",
        lineHeight: 1.0,
        margin: 0,
        color: "var(--ink)",
      }}>
        Since last session,{" "}
        <em style={{ fontStyle: "italic" }}>{recentCount} things moved.</em>
      </p>
    </div>
  );
}
