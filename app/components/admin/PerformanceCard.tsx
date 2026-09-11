import { ChevronDown, type LucideIcon } from "lucide-react";

export type PerformanceCardProps = {
  title: string;
  filterLabel?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  trend: string;
  trendType: "positive" | "danger";
};

export default function PerformanceCard({
  title,
  filterLabel = "Hari ini",
  icon: Icon,
  iconBg,
  iconColor,
  value,
  trend,
  trendType,
}: PerformanceCardProps) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-4 rounded-[15px] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 font-display text-[13px] text-queue-idle"
        >
          {filterLabel}
          <ChevronDown size={14} />
        </button>
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
