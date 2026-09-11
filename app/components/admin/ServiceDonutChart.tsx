import { ChevronDown } from "lucide-react";

export type ServiceDonutItem = {
  name: string;
  color: string;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
};

const DEFAULT_ITEMS: ServiceDonutItem[] = [
  {
    name: "Pembuatan KTP-el",
    color: "#8979FF",
    percentage: 35,
    strokeDasharray: "79.16 147",
    strokeDashoffset: 0,
  },
  {
    name: "Layanan Administrasi Kependudukan",
    color: "#FFAE4C",
    percentage: 25,
    strokeDasharray: "56.54 169.6",
    strokeDashoffset: -79.16,
  },
  {
    name: "Konsultasi Administrasi Kependudukan",
    color: "#3CC3DF",
    percentage: 22,
    strokeDasharray: "49.76 176.4",
    strokeDashoffset: -135.7,
  },
  {
    name: "Aktivasi Identitas Kependudukan Digital",
    color: "#FF928A",
    percentage: 18,
    strokeDasharray: "40.71 185.4",
    strokeDashoffset: -185.46,
  },
];

export type ServiceDonutChartProps = {
  items?: ServiceDonutItem[];
  filterLabel?: string;
  className?: string;
};

export default function ServiceDonutChart({
  items = DEFAULT_ITEMS,
  filterLabel = "Minggu Ini",
  className = "",
}: ServiceDonutChartProps) {
  return (
    <div
      className={`flex flex-col justify-between gap-6 rounded-[20px] bg-white p-6 shadow-soft ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-semibold text-ink">
          Antrean Per Layanan
        </h2>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 font-display text-[13px] text-queue-idle"
        >
          {filterLabel}
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
        <div className="relative size-44 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {items.map((item) => (
              <circle
                key={item.name}
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke={item.color}
                strokeWidth="22"
                strokeDasharray={item.strokeDasharray}
                strokeDashoffset={item.strokeDashoffset}
              />
            ))}
          </svg>
        </div>

        <div className="flex flex-col gap-3 font-display text-[13px] text-ink">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
