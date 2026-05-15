import type { ActivityEvent, TreeNode } from "../../types";
import { catStyle } from "../../styles/catTokens";

function relativeTime(when: string): string {
  const ms = Date.now() - new Date(when).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(when).toLocaleDateString();
}

export function ChangeStream({
  events,
  nodes,
  onSelect,
  onNavigate,
}: {
  events: ActivityEvent[];
  nodes: TreeNode[];
  onSelect: (id: string) => void;
  onNavigate: (view: string, nodeId?: string) => void;
}) {
  if (events.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)", fontSize: 14, marginTop: 24 }}>
        No recent activity recorded.
      </p>
    );
  }

  return (
    <div className="changeStreamRail" style={{ marginTop: 28 }}>
      <p className="monoCap" style={{ marginBottom: 14 }}>Recent Activity</p>
      {events.map((event, i) => {
        const cat = event.category ?? "";
        const { fg, bg } = cat ? catStyle(cat) : { fg: "var(--muted)", bg: "var(--paper-deep)" };
        return (
          <div key={`${event.id}-${i}`} className="changeEvent">
            <div
              className="changeEventDot"
              style={{ background: bg, border: `1.5px solid ${fg}` }}
            />
            <p className="monoCap" style={{ margin: "0 0 2px" }}>
              {relativeTime(event.when)} · {event.verb}
            </p>
            <button
              onClick={() => { onSelect(event.id); onNavigate("focus", event.id); }}
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                display: "block",
                marginBottom: 2,
              }}
            >
              {event.title}
            </button>
            {event.note && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)", margin: 0 }}>
                {event.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
