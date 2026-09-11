"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/auth/actions";
import Button from "../Button";
import Input from "../Input";
import Label from "../Label";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 animate-in fade-in"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="leading-snug">{state.error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username / Email Instansi</Label>
        <Input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          placeholder="disdukcapil.surabaya atau disdukcapil@civigo.com"
          defaultValue=""
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Masukkan password"
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        className="mt-1 flex items-center justify-center gap-2"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span>Memproses...</span>
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
