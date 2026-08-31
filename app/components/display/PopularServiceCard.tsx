import Image from "next/image";
import type { ComponentProps } from "react";

export type PopularServiceCardProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  icon: string;
  label: string;
};

export default function PopularServiceCard({
  icon,
  label,
  className = "",
  ...props
}: PopularServiceCardProps) {
  return (
    <button
      type="button"
      className={`flex h-[167px] cursor-pointer flex-col items-center justify-center gap-5 rounded-[15px] bg-white px-5 py-2.5 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top active:translate-y-0 ${className}`}
      {...props}
    >
      <Image src={icon} alt="" width={70} height={70} className="size-[70px]" />
      <span className="font-display text-[22px] font-medium leading-6 text-ink">
        {label}
      </span>
    </button>
  );
}
