import type { ComponentProps } from "react";

export type Status = "aktif" | "nonaktif";

const STATUSES: Record<Status, { label: string; className: string }> = {
  aktif: { label: "Aktif", className: "bg-success-soft text-success" },
  nonaktif: { label: "Nonaktif", className: "bg-warning-soft text-warning" },
};

export type StatusBadgeProps = Omit<ComponentProps<"span">, "children"> & {
  status: Status;
};

export default function StatusBadge({
  status,
  className = "",
  ...props
}: StatusBadgeProps) {
  const { label, className: statusClassName } = STATUSES[status];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[20px] px-[30px] py-0.5 font-display text-[16px] font-medium leading-6 ${statusClassName} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
}
