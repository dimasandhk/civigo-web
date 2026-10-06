import { AlertCircle, CheckCircle2 } from "lucide-react";

/** Pesan hasil form (berhasil / gagal), dipakai form di halaman Profil. */
export default function FormStatus({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
        <p className="leading-snug">{error}</p>
      </div>
    );
  }

  if (message) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p className="leading-snug">{message}</p>
      </div>
    );
  }

  return null;
}

/** Pesan kesalahan di bawah satu kolom. `id` dipakai `aria-describedby` kolomnya. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-600">
      {message}
    </p>
  );
}
