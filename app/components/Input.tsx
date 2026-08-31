import type { ComponentProps } from "react";

export type InputProps = ComponentProps<"input">;

export default function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`h-[52px] rounded-[10px] border border-line bg-white px-5 font-display text-[16px] leading-[52px] text-ink outline-none transition-colors placeholder:text-queue-idle/60 focus-visible:border-counter-top focus-visible:ring-2 focus-visible:ring-counter-top/25 ${className}`}
      {...props}
    />
  );
}
