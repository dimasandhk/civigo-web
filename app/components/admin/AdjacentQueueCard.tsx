export type AdjacentQueueCardProps = {
  label: string;
  number: string;
  name: string;
  service: string;
  /** Dims the card for an already-served entry. */
  muted?: boolean;
  /** Small label under the service, e.g. "Dimundurkan". */
  tag?: string;
};

export default function AdjacentQueueCard({
  label,
  number,
  name,
  service,
  muted = false,
  tag,
}: AdjacentQueueCardProps) {
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
        {tag && (
          <span className="w-fit rounded-md bg-warning-soft px-2 py-0.5 font-display text-xs font-semibold text-warning">
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}
