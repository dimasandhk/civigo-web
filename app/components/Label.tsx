import type { ComponentProps } from "react";

export type LabelProps = ComponentProps<"label">;

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={`font-display text-[15px] font-medium leading-4.75 text-ink ${className}`}
      {...props}
    />
  );
}
