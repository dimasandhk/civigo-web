export type DetailFieldProps = {
  label: string;
  value: string;
  /** Extra classes for the value, e.g. per-field letter spacing. */
  valueClassName?: string;
};

export default function DetailField({
  label,
  value,
  valueClassName = "",
}: DetailFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[16px] font-medium text-queue-idle">
        {label}
      </span>
      <span
        className={`font-display text-[20px] font-semibold text-ink ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}
