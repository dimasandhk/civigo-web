import type { ComponentProps } from "react";

export type ButtonVariant = "gradient" | "solid" | "success" | "danger";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

const BASE =
  "flex cursor-pointer items-center justify-center gap-2.5 rounded-[10px] font-display transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top";

const VARIANTS: Record<ButtonVariant, string> = {
  gradient:
    "h-13 bg-linear-to-b from-counter-top to-counter-bottom text-[18px] font-semibold text-white shadow-inset-soft",
  solid: "bg-brand py-2.5 text-[16px] font-medium leading-7 text-white",
  success: "bg-positive p-2.5 text-[16px] font-medium text-white",
  danger: "bg-danger p-2.5 text-[16px] font-medium text-white",
};

export default function Button({
  variant = "gradient",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
