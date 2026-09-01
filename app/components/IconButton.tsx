import type { ComponentProps } from "react";

export type IconButtonProps = ComponentProps<"button">;

export default function IconButton({
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-[10px] border-[0.8px] border-queue-idle/30 bg-white p-[5px] text-ink transition-colors hover:bg-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top ${className}`}
      {...props}
    />
  );
}
