"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changePassword, type ProfileState } from "@/lib/auth/actions";
import Button from "../Button";
import Label from "../Label";
import PasswordInput from "../PasswordInput";
import FormStatus, { FieldError } from "./FormStatus";

const FIELDS = [
  {
    name: "current_password",
    label: "Password Saat Ini",
    autoComplete: "current-password",
    errorKey: "currentPassword",
  },
  {
    name: "new_password",
    label: "Password Baru",
    autoComplete: "new-password",
    errorKey: "newPassword",
    hint: "Minimal 8 karakter, berbeda dari password saat ini.",
  },
  {
    name: "confirm_password",
    label: "Konfirmasi Password Baru",
    autoComplete: "new-password",
    errorKey: "confirmPassword",
  },
] as const;

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(
    changePassword,
    undefined,
  );

  return (
    // React mengosongkan kolom setelah setiap submit, jadi password tidak tertinggal di layar.
    <form action={formAction} className="flex flex-col gap-4">
      <FormStatus error={state?.error} message={state?.message} />

      {FIELDS.map((field) => {
        const error = state?.fieldErrors?.[field.errorKey];
        const describedBy = [
          "hint" in field ? `${field.name}-hint` : null,
          error ? `${field.name}-error` : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <PasswordInput
              id={field.name}
              name={field.name}
              required
              autoComplete={field.autoComplete}
              disabled={isPending}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
            />
            {"hint" in field && (
              <p id={`${field.name}-hint`} className="text-sm text-muted">
                {field.hint}
              </p>
            )}
            <FieldError id={`${field.name}-error`} message={error} />
          </div>
        );
      })}

      <Button type="submit" variant="solid" className="w-fit px-6" disabled={isPending}>
        {isPending ? <Loader2 className="size-5 animate-spin text-white" /> : "Ubah Password"}
      </Button>
    </form>
  );
}
