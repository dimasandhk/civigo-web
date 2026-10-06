import type { ReactNode } from "react";

export type ServiceDonutItem = {
  name: string;
  count: number;
  color: string;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
};

export type ServiceDonutChartProps = {
  items: ServiceDonutItem[];
  /** Kontrol di pojok kanan atas, mis. `<RangeSelect>`. */
  filter?: ReactNode;
  className?: string;
};

export default function ServiceDonutChart({
  items,
  filter,
  className = "",
}: ServiceDonutChartProps) {
  return (
    <div
      className={`flex flex-col justify-between gap-6 rounded-[20px] bg-white p-6 shadow-soft ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[18px] font-semibold text-ink">
          Antrean Per Layanan
        </h2>
        {filter}
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-1 text-center">
          <span className="font-display text-[15px] font-semibold text-queue-idle">
            Belum ada antrean
          </span>
          <span className="text-[13px] text-muted">pada periode ini.</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <div className="relative size-44 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
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

          <ul className="flex flex-col gap-3 font-display text-[13px] text-ink">
            {items.map((item) => (
              <li key={item.name} className="flex items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
                <span className="text-queue-idle">
                  {item.count} ({item.percentage}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
