export type QueueTag = {
  label: string;
  variant?: "warning" | "amber" | "success" | "neutral";
};

export type AdjacentQueueCardProps = {
  label: string;
  number: string;
  name: string;
  service: string;
  /** Dims the card for an already-served entry. */
  muted?: boolean;
  /** Small label under the service, e.g. "Dimundurkan". */
  tag?: string;
  tagVariant?: "warning" | "amber" | "success" | "neutral";
  tags?: QueueTag[];
};

const tagStyles: Record<string, string> = {
  warning: "bg-warning-soft text-warning",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  neutral: "bg-slate-100 text-slate-700 border border-slate-200",
};

export default function AdjacentQueueCard({
  label,
  number,
  name,
  service,
  muted = false,
  tag,
  tagVariant = "warning",
  tags,
}: AdjacentQueueCardProps) {
  const allTags: QueueTag[] = tags && tags.length > 0
    ? tags
    : tag
      ? [{ label: tag, variant: tagVariant }]
      : [];

  return (
    <div className="flex items-end gap-5 rounded-[20px] bg-white px-[35px] py-5 shadow-soft">
      <div className="flex flex-col gap-2.5">
        <span
          className={`font-display text-[20px] font-medium ${muted ? "text-muted" : "text-ink"}`}
        >
          {label}
        </span>
        <span
          className={`font-display text-[48px] font-semibold ${muted ? "text-muted" : "text-brand"}`}
        >
          {number}
        </span>
      </div>
      <div className="flex w-[172px] flex-col gap-2">
        <span
          className={`font-display text-[20px] font-semibold leading-6 tracking-[0.05em] ${muted ? "text-muted" : "text-ink"}`}
        >
          {name}
        </span>
        <span className="font-display text-[16px] font-medium text-queue-idle">
          {service}
        </span>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t, idx) => (
              <span
                key={idx}
                className={`w-fit rounded-md px-2 py-0.5 font-display text-xs font-semibold ${
                  tagStyles[t.variant ?? "warning"] ?? tagStyles.warning
                }`}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
