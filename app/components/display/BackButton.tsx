import { ArrowLeft } from "lucide-react";
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
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] bg-brand-soft px-4 py-2 font-display text-[16px] font-semibold text-brand transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-counter-top sm:rounded-[18px] sm:px-5 sm:py-2.5 sm:text-[18px] ${className}`}
      {...props}
    >
      <ArrowLeft size={22} className="shrink-0" />
      {label}
    </Link>
  );
}
