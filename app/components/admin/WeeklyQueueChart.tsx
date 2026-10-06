export type WeeklyDataPoint = {
  day: string;
  count: number;
  x: number;
  y: number;
};

export type WeeklyQueueChartProps = {
  points: WeeklyDataPoint[];
  yAxisGrid: { y: number; label: string }[];
  className?: string;
};

export default function WeeklyQueueChart({
  points,
  yAxisGrid,
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
        {/* Selalu minggu berjalan, tanpa filter (06/10/2026). */}
        <span className="font-display text-[13px] text-queue-idle">Senin–Jumat minggu ini</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative h-44 w-full">
          <svg viewBox="0 0 500 160" className="size-full overflow-visible">
            {/* Grid horizontal & label sumbu Y */}
            {yAxisGrid.map(({ y, label }) => (
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
