import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

export type FilterSelectProps = Omit<
  ComponentProps<"select">,
  "id" | "children"
> & {
  id: string;
  label: string;
  /** The first option doubles as the default "show everything" choice. */
  options: string[];
  containerClassName?: string;
};

export default function FilterSelect({
  id,
  label,
  options,
  containerClassName = "",
  className = "",
  ...props
}: FilterSelectProps) {
  return (
    <div className={`relative ${containerClassName}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className={`w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-[5px] pr-[54px] pl-5 font-display text-[16px] leading-7 font-medium text-placeholder outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={24}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-placeholder"
      />
    </div>
  );
}
