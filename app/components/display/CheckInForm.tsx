"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Loader2, QrCode, Search, UserCheck } from "lucide-react";

type CheckInTicket = {
  id: string;
  queue_number: string;
  status: string;
  schedule_date: string;
  time_block: string;
  service_name: string;
  counter_name: string | null;
  agency_name: string;
};

export default function CheckInForm() {
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ticket, setTicket] = useState<CheckInTicket | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setMessage(null);
    setTicket(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/queue/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({ code: code.trim() }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data?.error?.message ?? "Tiket antrean tidak ditemukan. Coba periksa kembali.");
        } else {
          setTicket(data.ticket);
          setMessage(data.message);
        }
      } catch {
        setError("Gagal menghubungi server. Periksa koneksi jaringan.");
      }
    });
  };

  return (
    <div className="flex w-full max-w-[800px] flex-col items-center gap-6">
      {/* Result Card Modal when Check-in succeeds */}
      {ticket ? (
        <div className="flex w-full max-w-[540px] flex-col items-center gap-5 rounded-[24px] bg-white p-6 sm:p-8 shadow-card animate-in fade-in zoom-in-95">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} />
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <h2 className="font-display text-2xl font-bold text-ink">Check-in Berhasil!</h2>
            <p className="font-display text-sm text-queue-idle">
              {message ?? "Kehadiran Anda telah tercatat di sistem."}
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-2 rounded-[18px] bg-brand-tint/40 p-5 border border-brand/20">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">
              Nomor Antrean Anda
            </span>
            <span className="font-display text-6xl font-extrabold text-brand tracking-tight">
              {ticket.queue_number}
            </span>
            <div className="mt-2 flex flex-col items-center text-center gap-1 text-sm font-medium text-ink">
              <span>{ticket.agency_name} — {ticket.service_name}</span>
              <span className="flex items-center gap-1.5 text-xs text-queue-idle">
                <Clock size={14} /> Sesi: {ticket.time_block}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 text-center">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
              <UserCheck size={16} className="shrink-0 text-amber-600" />
              <span>Silakan duduk di ruang tunggu dan perhatikan monitor display antrean.</span>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setTicket(null);
                  setCode("");
                  setMessage(null);
                }}
                className="flex-1 cursor-pointer rounded-[12px] border border-line py-3 font-display text-sm font-semibold text-ink hover:bg-board transition-colors"
              >
                Scan Lagi
              </button>
              <Link
                href="/display"
                className="flex-1 flex items-center justify-center cursor-pointer rounded-[12px] bg-brand py-3 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 transition-opacity"
              >
                Selesai
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
          {/* Header */}
          <header className="flex flex-col items-center gap-1 sm:gap-2 text-center">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px] font-semibold leading-tight text-ink">
              Pindai Kode Antrean
            </h1>
            <p className="font-display text-base sm:text-lg font-medium text-brand">
              Masukkan Nomor Antrean atau NIK Anda untuk konfirmasi kehadiran
            </p>
          </header>

          {/* Scan Area Box Graphic */}
          <section className="flex flex-col items-center gap-2">
            <div className="flex h-[140px] w-[180px] sm:h-[160px] sm:w-[200px] flex-col items-center justify-center gap-2 rounded-[16px] bg-zinc-700 p-4 shadow-soft text-white/90">
              <QrCode size={42} className="text-white/80 animate-pulse" />
              <span className="text-center font-display text-xs font-semibold tracking-wider uppercase text-white/70">
                Arahkan QR ke Kamera
              </span>
            </div>
          </section>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="flex w-full max-w-[460px] items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 animate-in fade-in"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          {/* Manual Code Input Form */}
          <form onSubmit={handleSubmit} className="flex w-full max-w-[460px] flex-col items-center gap-3">
            <div className="relative w-full">
              <input
                id="code"
                name="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ketik Nomor Antrean (cth: A-01) atau NIK"
                disabled={isPending}
                autoFocus
                className="w-full rounded-[16px] bg-white px-5 py-3.5 text-center font-display text-base sm:text-lg font-semibold text-ink shadow-card outline-none placeholder:text-queue-idle/60 focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !code.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-counter-top to-counter-bottom py-3.5 font-display text-base font-semibold text-white shadow-soft transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Memeriksa Tiket...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Konfirmasi Kehadiran (Check-In)</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
