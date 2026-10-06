import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PerformanceCardProps = {
  title: string;
  /** Kontrol di pojok kanan atas, mis. `<RangeSelect>`. */
  filter?: ReactNode;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  trend: string;
  trendType: "positive" | "danger";
};

export default function PerformanceCard({
  title,
  filter,
  icon: Icon,
  iconBg,
  iconColor,
  value,
  trend,
  trendType,
}: PerformanceCardProps) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-4 rounded-[15px] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-medium text-ink">{title}</span>
        {filter}
      </div>
      <div className="flex items-center gap-4">
        <div
          className="flex size-[52px] shrink-0 items-center justify-center rounded-[15px]"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon size={26} />
        </div>
        <span className="font-display text-[32px] font-bold text-ink">
          {value}
        </span>
      </div>
      <span
        className={`text-[13px] font-medium ${
          trendType === "positive" ? "text-positive" : "text-danger"
        }`}
      >
        {trend}
      </span>
    </div>
  );
}
