"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { updateProfileName, type ProfileState } from "@/lib/auth/actions";
import Button from "../Button";
import Input from "../Input";
import Label from "../Label";
import FormStatus, { FieldError } from "./FormStatus";

export default function ProfileNameForm({ fullName }: { fullName: string }) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(
    updateProfileName,
    undefined,
  );
  const nameError = state?.fieldErrors?.fullName;

  return (
    <form action={formAction} className="flex flex-col gap-4 border-t border-line pt-6">
      <FormStatus error={state?.error} message={state?.message} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nama Lengkap</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          defaultValue={fullName}
          disabled={isPending}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "full_name-error" : undefined}
        />
        <FieldError id="full_name-error" message={nameError} />
      </div>

      <Button type="submit" variant="solid" className="w-fit px-6" disabled={isPending}>
        {isPending ? <Loader2 className="size-5 animate-spin text-white" /> : "Simpan Nama"}
      </Button>
    </form>
  );
}
