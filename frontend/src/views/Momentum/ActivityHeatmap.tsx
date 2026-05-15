import type { ActivityEvent, TreeNode } from "../../types";

const WEEKS = 13;
const DAYS = 7;

function buildGrid(nodes: TreeNode[], events: ActivityEvent[]): number[][] {
  const counts = new Map<string, number>();
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  for (const n of nodes) {
    if (n.summary) {
      const d = new Date(n.summary.slice(0, 10));
      if (!isNaN(d.getTime())) counts.set(toKey(d), (counts.get(toKey(d)) ?? 0) + 1);
    }
  }
  for (const e of events) {
    const d = new Date(e.when);
    if (!isNaN(d.getTime())) counts.set(toKey(d), (counts.get(toKey(d)) ?? 0) + 1);
  }

  const grid: number[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - WEEKS * 7 + 1);

  for (let w = 0; w < WEEKS; w++) {
    const week: number[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push(counts.get(toKey(date)) ?? 0);
    }
    grid.push(week);
  }
  return grid;
}

function cellColor(v: number, max: number): string {
  if (v === 0) return "var(--paper-deep)";
  const norm = Math.min(v / Math.max(max, 1), 1);
  const chroma = 0.04 + norm * 0.10;
  const alpha = 0.4 + norm * 0.6;
  return `oklch(0.88 ${chroma.toFixed(3)} 145 / ${alpha.toFixed(2)})`;
}

export function ActivityHeatmap({ nodes, events }: { nodes: TreeNode[]; events: ActivityEvent[] }) {
  const grid = buildGrid(nodes, events);
  const max = Math.max(...grid.flatMap((w) => w), 1);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        className="heatmapGrid"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, 14px)`,
          gridTemplateRows: `repeat(${DAYS}, 14px)`,
        }}
      >
        {grid.flatMap((week, wi) =>
          week.map((count, di) => (
            <div
              key={`${wi}-${di}`}
              className="heatmapCell"
              title={`${count} events`}
              style={{
                width: 14,
                height: 14,
                background: cellColor(count, max),
                gridColumn: wi + 1,
                gridRow: di + 1,
              }}
            />
          )),
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 3 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>more</span>
        {[1, 0.75, 0.5, 0.25, 0].map((v) => (
          <div
            key={v}
            style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(v * max, max) }}
          />
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>less</span>
      </div>
    </div>
  );
}
