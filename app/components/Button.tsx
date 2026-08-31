import type { ComponentProps } from "react";

export type ButtonProps = ComponentProps<"button">;

export default function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`h-13 cursor-pointer rounded-[10px] bg-linear-to-b from-counter-top to-counter-bottom font-display text-[18px] font-semibold text-white shadow-inset-soft transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top ${className}`}
      {...props}
    />
  );
}
