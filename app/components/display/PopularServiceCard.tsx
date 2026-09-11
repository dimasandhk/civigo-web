import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type PopularServiceCardProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  icon: LucideIcon;
  label: string;
  iconBackground: string;
  iconColor: string;
};

export default function PopularServiceCard({
  icon: Icon,
  label,
  iconBackground,
  iconColor,
  className = "",
  ...props
}: PopularServiceCardProps) {
  return (
    <button
      type="button"
      className={`flex h-[125px] sm:h-[140px] lg:h-[150px] cursor-pointer flex-col items-center justify-center gap-3 sm:gap-4 rounded-[16px] bg-white px-3 py-2.5 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-counter-top active:translate-y-0 shadow-soft ${className}`}
      {...props}
    >
      <span
        className="flex size-[52px] sm:size-[60px] lg:size-[64px] shrink-0 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon size={38} strokeWidth={1.2} style={{ color: iconColor }} />
      </span>
      <span className="font-display text-[15px] sm:text-[17px] lg:text-[19px] font-medium leading-tight text-ink text-center">
        {label}
      </span>
    </button>
  );
}
