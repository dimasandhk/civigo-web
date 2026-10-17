"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, BellRing, CheckCircle2, Clock, Loader2, Printer, Search, UserCheck, Users } from "lucide-react";
import type { CheckInOutcome, CheckInTicket } from "@/lib/queue/check-in";
import { parseTicketQr } from "@/lib/queue/qr";
import QrScanner from "./QrScanner";

type CheckInResponse = {
  tickets: CheckInTicket[];
  checkedInCount: number;
  message: string;
};

/** The same QR held in front of the camera is decoded many times a second; check it in once. */
const RESCAN_COOLDOWN_MS = 4000;

const OUTCOME_BADGE: Record<CheckInOutcome, { label: string; className: string }> = {
  checked_in: { label: "Check-in berhasil", className: "bg-emerald-100 text-emerald-700" },
  already_checked_in: { label: "Sudah check-in", className: "bg-emerald-50 text-emerald-700" },
  being_served: { label: "Sedang dipanggil", className: "bg-amber-100 text-amber-800" },
  completed: { label: "Sudah selesai", className: "bg-zinc-100 text-zinc-600" },
  skipped: { label: "Hangus", className: "bg-red-100 text-red-700" },
  canceled: { label: "Dibatalkan", className: "bg-rose-100 text-rose-700" },
};

function badgeLabel(ticket: CheckInTicket): string {
  return ticket.outcome === "being_served"
    ? `Sedang dipanggil di ${ticket.counter_name ?? "loket"}`
    : OUTCOME_BADGE[ticket.outcome].label;
}

function TicketCard({ ticket, large }: { ticket: CheckInTicket; large: boolean }) {
  const finished = ticket.outcome === "completed" || ticket.outcome === "skipped" || ticket.outcome === "canceled";

  return (
    <div
      className={`flex w-full flex-col items-center gap-2 rounded-[18px] border p-5 ${
        ticket.outcome === "being_served"
          ? "border-amber-300 bg-amber-50"
          : finished
            ? "border-line bg-board/60"
            : "border-brand/20 bg-brand-tint/40"
      }`}
    >
      {large && (
        <span className="text-xs font-semibold uppercase tracking-wider text-brand">Nomor Antrean Anda</span>
      )}
      <span
        className={`font-display font-extrabold tracking-tight ${large ? "text-6xl" : "text-4xl"} ${
          finished ? "text-queue-idle" : "text-brand"
        }`}
      >
        {ticket.queue_number}
      </span>
      <div className="flex flex-col items-center text-center gap-1 text-sm font-medium text-ink">
        <span>
          {ticket.agency_name} — {ticket.service_name}
        </span>
        {ticket.family_member_name && (
          <span className="flex items-center gap-1.5 text-xs text-queue-idle">
            <Users size={14} /> Atas nama: {ticket.family_member_name}
          </span>
        )}
        {ticket.time_block && (
          <span className="flex items-center gap-1.5 text-xs text-queue-idle">
            <Clock size={14} /> Sesi: {ticket.time_block}
          </span>
        )}
      </div>
      <span
        className={`mt-1 rounded-full px-3 py-1 text-xs font-semibold ${OUTCOME_BADGE[ticket.outcome].className}`}
      >
        {badgeLabel(ticket)}
      </span>
    </div>
  );
}

export default function CheckInForm({ homeHref, locationId }: { homeHref: string; locationId: number }) {
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScan = useRef<{ text: string; at: number } | null>(null);

  const checkIn = (submitted: string) => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/queue/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({ code: submitted, location_id: locationId }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data?.error?.message ?? "Tiket antrean tidak ditemukan. Coba periksa kembali.");
        } else {
          setResult({ tickets: data.tickets, checkedInCount: data.checkedInCount, message: data.message });
        }
      } catch {
        setError("Gagal menghubungi server. Periksa koneksi jaringan.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    checkIn(code.trim());
  };

  const handleScan = (text: string) => {
    if (isPending) return;

    const now = Date.now();
    if (lastScan.current?.text === text && now - lastScan.current.at < RESCAN_COOLDOWN_MS) return;
    lastScan.current = { text, at: now };

    // QR lain (URL, QRIS, dll.) tidak dikirim ke server.
    if (!parseTicketQr(text)) {
      setError("QR code tidak dikenali. Gunakan QR tiket dari aplikasi CiviGo, atau ketik NIK / nomor antrean.");
      return;
    }
    checkIn(text);
  };

  const beingServed = result?.tickets.some((t) => t.outcome === "being_served") ?? false;

  return (
    <div className="flex w-full max-w-[800px] flex-col items-center gap-6">
      {/* Result Card Modal when Check-in succeeds */}
      {result ? (
        <div className="flex w-full max-w-[540px] flex-col items-center gap-5 rounded-[24px] bg-white p-6 sm:p-8 shadow-card animate-in fade-in zoom-in-95">
          <div
            className={`flex size-16 items-center justify-center rounded-full ${
              beingServed ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {beingServed ? <BellRing size={34} /> : <CheckCircle2 size={36} />}
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <h2 className="font-display text-2xl font-bold text-ink">
              {result.checkedInCount > 0
                ? "Check-in Berhasil!"
                : beingServed
                  ? "Nomor Anda Sedang Dipanggil"
                  : "Anda Sudah Check-in"}
            </h2>
            <p className="font-display text-sm text-queue-idle">{result.message}</p>
          </div>

          <div className="flex w-full flex-col gap-3">
            {result.tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} large={result.tickets.length === 1} />
            ))}
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
                  setResult(null);
                  setCode("");
                  lastScan.current = null;
                }}
                className="flex-1 cursor-pointer rounded-[12px] border border-line py-3 font-display text-sm font-semibold text-ink hover:bg-board transition-colors"
              >
                Scan Lagi
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-[12px] border border-line bg-white py-3 font-display text-sm font-semibold text-ink hover:bg-board shadow-xs transition-colors"
              >
                <Printer size={16} />
                <span>Cetak Slip</span>
              </button>
              <Link
                href={homeHref}
                className="flex-1 flex items-center justify-center cursor-pointer rounded-[12px] bg-brand py-3 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 transition-opacity"
              >
                Selesai
              </Link>
            </div>

            {/* Struk Fisik Thermal 80mm/58mm (Hanya muncul saat dicetak) */}
            <div className="printable-receipt hidden">
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>CIVIGO — MPP SIOLA</h2>
                <p style={{ fontSize: "11px", margin: "2px 0" }}>Mal Pelayanan Publik Kota Surabaya</p>
                <div style={{ borderBottom: "1px dashed #000", margin: "6px 0" }} />
              </div>

              {result.tickets.map((t) => (
                <div key={t.id} style={{ textAlign: "center", marginBottom: "10px" }}>
                  <p style={{ fontSize: "11px", margin: "2px 0", fontWeight: "bold" }}>{t.agency_name}</p>
                  <p style={{ fontSize: "11px", margin: "2px 0" }}>{t.service_name}</p>
                  <p style={{ fontSize: "28px", fontWeight: "bold", margin: "6px 0", letterSpacing: "1px" }}>
                    {t.queue_number}
                  </p>
                  {t.family_member_name && (
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>Atas Nama: {t.family_member_name}</p>
                  )}
                  {t.time_block && (
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>Sesi: {t.time_block}</p>
                  )}
                  <p style={{ fontSize: "10px", margin: "2px 0" }}>Status: Kehadiran Terkonfirmasi</p>
                  <div style={{ borderBottom: "1px dashed #000", margin: "6px 0" }} />
                </div>
              ))}

              <div style={{ textAlign: "center", fontSize: "10px", marginTop: "8px" }}>
                <p style={{ margin: "2px 0" }}>Silakan menunggu di ruang tunggu.</p>
                <p style={{ margin: "2px 0" }}>Perhatikan layar monitor & pengeras suara.</p>
                <p style={{ margin: "4px 0", fontSize: "9px" }}>
                  Dicetak pada: {new Date().toLocaleDateString("id-ID")} {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
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
              Tunjukkan QR tiket dari aplikasi CiviGo, atau masukkan NIK / Nomor Antrean Anda
            </p>
          </header>

          {/* Kamera pemindai QR */}
          <section className="flex flex-col items-center gap-2">
            <QrScanner onScan={handleScan} busy={isPending} />
            <p className="font-display text-xs text-queue-idle text-center max-w-[340px] leading-relaxed">
              💡 <strong>Layar HP silau?</strong> Beri jarak sekitar 20–30 cm atau miringkan HP sedikit (±15°) agar cahaya layar tidak memantul ke kamera.
            </p>
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
                placeholder="Ketik NIK (16 digit) atau Nomor Antrean (cth: A-01)"
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
