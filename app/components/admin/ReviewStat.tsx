export type ReviewStatProps = {
  label: string;
  value: string;
  /** Smaller trailing unit, e.g. "/5" or "%". */
  unit?: string;
};

export default function ReviewStat({ label, value, unit }: ReviewStatProps) {
  return (
    <div className="flex flex-col justify-center gap-2.5 text-center">
      <span className="font-display text-[20px] leading-7 font-medium text-ink/70">
        {label}
      </span>
      <span className="font-display text-[52px] leading-none font-bold tracking-[0.04em] text-brand">
        {value}
        {unit ? <span className="text-[32px]">{unit}</span> : null}
      </span>
    </div>
  );
}
