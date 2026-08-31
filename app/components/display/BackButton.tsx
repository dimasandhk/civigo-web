import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

export type BackButtonProps = Omit<ComponentProps<typeof Link>, "children"> & {
  label?: string;
};

export default function BackButton({
  label = "Kembali",
  className = "",
  ...props
}: BackButtonProps) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2.5 rounded-[20px] bg-brand-soft py-2.5 pr-[30px] pl-5 font-display text-[24px] font-medium text-brand transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top ${className}`}
      {...props}
    >
      <Image
        src="/icons/arrow-left.svg"
        alt=""
        width={35}
        height={35}
        className="shrink-0"
      />
      {label}
    </Link>
  );
}
