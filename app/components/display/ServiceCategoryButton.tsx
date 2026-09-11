import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

export type ServiceCategoryButtonProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  label: string;
};

export default function ServiceCategoryButton({
  label,
  className = "",
  ...props
}: ServiceCategoryButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-[46px] sm:h-[50px] cursor-pointer items-center justify-between gap-2 rounded-[12px] bg-white px-3 sm:px-4 font-display text-[14px] sm:text-[16px] font-medium leading-tight text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-counter-top active:translate-y-0 shadow-soft ${className}`}
      {...props}
    >
      <span>{label}</span>
      <ChevronRight
        size={18}
        strokeWidth={2}
        className="shrink-0 text-brand"
      />
    </button>
  );
}
