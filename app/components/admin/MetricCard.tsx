import type { LucideIcon } from "lucide-react";

export type MetricCardProps = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  unit: string;
  trend: string;
  trendType: "positive" | "danger";
};

export default function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  unit,
  trend,
  trendType,
}: MetricCardProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[15px] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <div
          className="flex size-[52px] shrink-0 items-center justify-center rounded-[15px]"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon size={26} />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-ink">{label}</span>
          <div className="flex items-baseline">
            <span className="font-display text-[26px] font-bold text-ink">
              {value}
            </span>
            <span className="ml-1.5 font-display text-[15px] font-normal text-ink">
              {unit}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center border-t border-line pt-2.5">
        <span
          className={`text-[13px] font-medium ${
            trendType === "positive" ? "text-positive" : "text-danger"
          }`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
