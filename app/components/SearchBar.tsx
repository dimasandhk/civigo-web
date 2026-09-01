import { Search } from "lucide-react";
import type { ComponentProps } from "react";

export type SearchBarSize = "lg" | "sm";

const SIZES: Record<
  SearchBarSize,
  { container: string; icon: number; strokeWidth: number; input: string }
> = {
  lg: {
    container: "gap-5 rounded-[20px] bg-field px-[25px] py-2.5",
    icon: 30,
    strokeWidth: 1.6,
    input: "text-[22px] leading-6",
  },
  sm: {
    container: "h-[45px] gap-5 rounded-[12px] bg-white px-4 shadow-sm",
    icon: 15,
    strokeWidth: 2,
    input: "text-[16px] leading-6",
  },
};

export type SearchBarProps = Omit<ComponentProps<"input">, "size" | "id"> & {
  id: string;
  label: string;
  size?: SearchBarSize;
  containerClassName?: string;
};

export default function SearchBar({
  id,
  label,
  size = "lg",
  containerClassName = "",
  className = "",
  ...props
}: SearchBarProps) {
  const config = SIZES[size];

  return (
    <div
      className={`flex items-center ${config.container} ${containerClassName}`}
    >
      <Search
        size={config.icon}
        strokeWidth={config.strokeWidth}
        className="shrink-0 text-muted"
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={`w-full bg-transparent font-display text-ink outline-none placeholder:text-placeholder ${config.input} ${className}`}
        {...props}
      />
    </div>
  );
}
