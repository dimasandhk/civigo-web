import type { ComponentProps } from "react";

export type LoketTabProps = Omit<ComponentProps<"button">, "children"> & {
  label: string;
  isActive?: boolean;
};

export default function LoketTab({
  label,
  isActive = false,
  className = "",
  ...props
}: LoketTabProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={`flex h-[50px] w-[220px] cursor-pointer items-center justify-center gap-2.5 rounded-[10px] font-display text-[18px] font-medium leading-5 text-ink shadow-inset-soft transition-colors ${
        isActive ? "bg-brand-tint" : "bg-white hover:bg-board"
      } ${className}`}
      {...props}
    >
      {label}
    </button>
  );
}
