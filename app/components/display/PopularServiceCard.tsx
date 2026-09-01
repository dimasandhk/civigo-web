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
      className={`flex h-[167px] cursor-pointer flex-col items-center justify-center gap-5 rounded-[15px] bg-white px-5 py-2.5 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top active:translate-y-0 ${className}`}
      {...props}
    >
      <span
        className="flex size-[70px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon size={54} strokeWidth={0.9} style={{ color: iconColor }} />
      </span>
      <span className="font-display text-[22px] font-medium leading-6 text-ink">
        {label}
      </span>
    </button>
  );
}
