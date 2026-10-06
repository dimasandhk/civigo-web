"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input, { type InputProps } from "./Input";

export type PasswordInputProps = Omit<InputProps, "type">;

/**
 * Kolom password dengan tombol tampilkan/sembunyikan.
 *
 * Tombolnya `type="button"` supaya tidak ikut men-submit form, dan label
 * aksesibilitasnya mengikuti keadaan sekarang ("Tampilkan" / "Sembunyikan").
 */
export default function PasswordInput({ className = "", disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`w-full pr-13 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        title={visible ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-2 my-auto flex size-9 cursor-pointer items-center justify-center rounded-lg text-queue-idle transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-counter-top disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
