"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/?error=auth_required");
          return;
        }

        setUserEmail(user.email || "");
      } catch (err) {
        console.error("Gagal memeriksa sesi pengguna:", err);
        router.replace("/");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || "Gagal memperbarui kata sandi.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan saat mereset kata sandi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex w-full max-w-115 flex-col items-center justify-center rounded-[30px] bg-white p-10 shadow-soft">
        <p className="font-display text-[15px] text-queue-idle">
          Memeriksa sesi login Anda...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-115 flex-col items-center gap-[30px] rounded-[30px] bg-white px-[45px] py-[40px] shadow-soft">
      <header className="flex flex-col items-center gap-4">
        <Image
          src="/civigo-logo.svg"
          alt="CiviGo"
          width={601}
          height={537}
          priority
          className="h-16 w-auto"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[28px] font-extrabold leading-8 text-ink">
            Atur Kata Sandi Baru
          </h1>
          <p className="font-display text-[14px] leading-[18px] text-queue-idle">
            Atur ulang kata sandi baru untuk akun CiviGo Anda yang sedang aktif.
          </p>
        </div>
      </header>

      {success ? (
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="font-medium text-ink">
            Kata sandi Anda berhasil diperbarui! Silakan gunakan kata sandi baru Anda untuk sesi berikutnya.
          </p>
          <Link href="/" className="w-full">
            <Button type="button" className="w-full mt-2">
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email Akun Anda</Label>
            <Input
              id="email"
              name="email"
              type="email"
              readOnly
              disabled
              value={userEmail}
              className="bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Kata Sandi Baru</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
          </Button>

          <div className="mt-2 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-queue-idle hover:text-ink"
            >
              Batal dan Kembali
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-12">
      <Suspense fallback={<div>Memuat formulir...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
