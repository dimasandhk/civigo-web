"use client";

import { ExternalLink, Ticket, Tv, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type DisplayConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DisplayConfirmModal({
  isOpen,
  onClose,
}: DisplayConfirmModalProps) {
  const router = useRouter();

  // Tutup modal jika tombol Escape ditekan
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="display-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog Content */}
      <div className="relative z-10 flex w-full max-w-[540px] flex-col gap-6 rounded-[24px] bg-white p-6 shadow-card sm:p-7">
        {/* Tombol Tutup X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 cursor-pointer rounded-full p-1.5 text-muted hover:bg-board hover:text-ink"
          aria-label="Tutup dialog"
        >
          <X size={20} />
        </button>

        {/* Header Dialog */}
        <div className="flex flex-col gap-1 pr-6">
          <h2
            id="display-modal-title"
            className="font-display text-[22px] font-bold text-ink"
          >
            Pusat Layar Publik & Kios
          </h2>
          <p className="font-display text-[14px] leading-relaxed text-muted">
            Pilih jenis layar operasional yang ingin dibuka untuk monitor ruang
            tunggu atau mesin pendaftaran mandiri:
          </p>
        </div>

        {/* Dua Pilihan Layar */}
        <div className="flex flex-col gap-4">
          {/* Opsi 1: Monitor TV Display Antrean */}
          <div className="flex flex-col justify-between gap-3.5 rounded-[16px] border border-line bg-board p-4 transition-all hover:border-brand/30 hover:bg-white hover:shadow-soft">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-tint text-brand">
                <Tv size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[16px] font-bold text-ink">
                  Monitor Display Antrean
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  Ditampilkan pada TV ruang tunggu untuk nomor antrean aktif
                  dan panggilan loket.
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  window.open("/display/antrean", "_blank");
                  onClose();
                }}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-brand px-3.5 py-2 font-display text-[13px] font-semibold text-white shadow-xs transition-opacity hover:opacity-95 sm:flex-initial"
              >
                <ExternalLink size={14} />
                Buka di Tab Baru (Monitor TV)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/display/antrean");
                }}
                className="cursor-pointer rounded-[8px] border border-line bg-white px-3 py-2 font-display text-[13px] font-medium text-ink transition-colors hover:bg-board"
              >
                Buka di Sini
              </button>
            </div>
          </div>

          {/* Opsi 2: Mesin Kios Mandiri */}
          <div className="flex flex-col justify-between gap-3.5 rounded-[16px] border border-line bg-board p-4 transition-all hover:border-success/30 hover:bg-white hover:shadow-soft">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-success-soft text-success">
                <Ticket size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[16px] font-bold text-ink">
                  Mesin Kios Pendaftaran & Check-in
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  Ditampilkan pada mesin layar sentuh untuk warga mengambil
                  tiket antrean walk-in atau scan QR.
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  window.open("/display", "_blank");
                  onClose();
                }}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-success px-3.5 py-2 font-display text-[13px] font-semibold text-white shadow-xs transition-opacity hover:opacity-95 sm:flex-initial"
              >
                <ExternalLink size={14} />
                Buka di Tab Baru (Kiosk Mode)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/display");
                }}
                className="cursor-pointer rounded-[8px] border border-line bg-white px-3 py-2 font-display text-[13px] font-medium text-ink transition-colors hover:bg-board"
              >
                Buka di Sini
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer font-display text-[14px] font-medium text-muted hover:text-ink"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
