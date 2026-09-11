import { ChevronDown } from "lucide-react";

export type WeeklyDataPoint = {
  day: string;
  count: number;
  x: number;
  y: number;
};

const DEFAULT_POINTS: WeeklyDataPoint[] = [
  { day: "Mon", count: 90, x: 35, y: 15 },
  { day: "Tue", count: 45, x: 145, y: 75 },
  { day: "Wed", count: 88, x: 255, y: 18 },
  { day: "Thu", count: 72, x: 365, y: 39 },
  { day: "Fri", count: 40, x: 475, y: 82 },
];

const Y_AXIS_GRID = [
  { y: 15, label: "90" },
  { y: 55, label: "60" },
  { y: 95, label: "30" },
  { y: 135, label: "0" },
];

export type WeeklyQueueChartProps = {
  points?: WeeklyDataPoint[];
  filterLabel?: string;
  className?: string;
};

export default function WeeklyQueueChart({
  points = DEFAULT_POINTS,
  filterLabel = "Minggu Ini",
  className = "",
}: WeeklyQueueChartProps) {
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className={`flex flex-col justify-between gap-6 rounded-[20px] bg-white p-6 shadow-soft ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-semibold text-ink">
          Antrean Per Minggu
        </h2>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 font-display text-[13px] text-queue-idle"
        >
          {filterLabel}
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative h-44 w-full">
          <svg viewBox="0 0 500 160" className="size-full overflow-visible">
            {/* Grid horizontal & label sumbu Y */}
            {Y_AXIS_GRID.map(({ y, label }) => (
              <g key={label}>
                <text
                  x="10"
                  y={y + 4}
                  fill="#71717A"
                  fontSize="12"
                  className="font-display font-medium"
                >
                  {label}
                </text>
                <line
                  x1="35"
                  y1={y}
                  x2="490"
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* Garis tren grafik */}
            <polyline
              fill="none"
              stroke="#8979FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />

            {/* Titik data */}
            {points.map((p) => (
              <circle
                key={p.day}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="white"
                stroke="#8979FF"
                strokeWidth="2"
              />
            ))}

            {/* Label sumbu X */}
            {points.map((p) => (
              <text
                key={p.day}
                x={p.x}
                y="155"
                textAnchor="middle"
                fill="#71717A"
                fontSize="12"
                className="font-display font-medium"
              >
                {p.day}
              </text>
            ))}
          </svg>
        </div>

        {/* Legenda Indikator */}
        <div className="flex items-center justify-center gap-2 pt-2 font-display text-[13px] text-ink">
          <span className="size-3 rounded-full bg-[#8979FF]" />
          <span>Pengunjung</span>
        </div>
      </div>
    </div>
  );
}
