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
      className={`flex h-[60px] cursor-pointer items-center gap-2.5 rounded-[15px] bg-white px-[15px] font-display text-[20px] font-medium leading-6 text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top active:translate-y-0 ${className}`}
      {...props}
    >
      {label}
      <ChevronRight
        size={20}
        strokeWidth={1.8}
        className="shrink-0 text-brand"
      />
    </button>
  );
}
