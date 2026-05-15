export type Decision = "approved" | "rejected" | "edit" | "pending";

export function DecBtn({
  label,
  kind,
  active,
  onClick,
}: {
  label: string;
  kind: "approve" | "reject" | "edit";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`decBtn ${active ? `active ${kind}` : ""}`}
      onClick={onClick}
      title={kind}
    >
      {label}
    </button>
  );
}
