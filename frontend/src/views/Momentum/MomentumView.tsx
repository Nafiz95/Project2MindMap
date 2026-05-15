import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { ActivityEvent, TreePayload } from "../../types";
import { SkeletonBlock } from "../../components/primitives/SkeletonBlock";
import { MomentumHeader } from "./MomentumHeader";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ChangeStream } from "./ChangeStream";
import { AttentionCards } from "./AttentionCards";
import { ActiveFronts } from "./ActiveFronts";

export function MomentumView({
  projectId,
  tree,
  onNavigate,
  onSelect,
}: {
  projectId: string;
  tree: TreePayload | null;
  onNavigate: (view: string, nodeId?: string) => void;
  onSelect: (id: string) => void;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    api
      .activity(projectId, since, 100)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [projectId]);

  const nodes = tree?.nodes ?? [];
  const recentCount = events.filter(
    (e) => Date.now() - new Date(e.when).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const weekNumber = getWeekNumber(new Date());
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

  if (eventsLoading) {
    return (
      <div className="featureView" style={{ padding: 32, display: "grid", gap: 16 }}>
        <SkeletonBlock height="90px" />
        <SkeletonBlock height="140px" />
        <SkeletonBlock height="200px" />
      </div>
    );
  }

  return (
    <div className="featureView momentumLayout">
      <MomentumHeader
        weekNumber={weekNumber}
        weekStart={weekStart}
        weekEnd={weekEnd}
        recentCount={recentCount}
      />

      <div className="momentumBody">
        {/* Left column */}
        <div className="momentumLeftCol">
          <p className="monoCap" style={{ marginBottom: 12 }}>Activity · 13 weeks</p>
          <ActivityHeatmap nodes={nodes} events={events} />

          <ChangeStream events={events.slice(0, 20)} nodes={nodes} onSelect={onSelect} onNavigate={onNavigate} />
        </div>

        {/* Right column */}
        <div className="momentumRightCol">
          <AttentionCards
            nodes={nodes}
            onNavigate={onNavigate}
            onSelect={onSelect}
          />
          <ActiveFronts
            projectId={projectId}
            nodes={nodes}
            onSelect={onSelect}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
