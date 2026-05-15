export function SkeletonBlock({
  width = "100%",
  height = "16px",
  radius = 4,
}: {
  width?: string;
  height?: string;
  radius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--paper-deep)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}
