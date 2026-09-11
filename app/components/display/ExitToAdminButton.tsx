"use client";

import { LayoutDashboard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../Button";

export type ExitToAdminButtonProps = {
  className?: string;
};

export default function ExitToAdminButton({
  className = "fixed top-4 right-4 sm:top-5 sm:right-6 z-40",
}: ExitToAdminButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Tutup jika tombol Escape ditekan
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Tombol trigger diskret di pojok layar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex cursor-pointer items-center gap-2 rounded-[14px] border border-line bg-white/90 px-3.5 py-2 font-display text-[14px] font-semibold text-ink shadow-soft backdrop-blur-xs transition-all hover:border-brand/40 hover:bg-white hover:text-brand ${className}`}
        title="Kembali ke Dashboard Admin"
      >
        <LayoutDashboard size={18} />
        <span className="hidden sm:inline">Dashboard Admin</span>
      </button>

      {/* Modal Dialog Konfirmasi */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card */}
          <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-6 rounded-[24px] bg-white p-6 shadow-card sm:p-7">
            {/* Tombol Tutup X */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 cursor-pointer rounded-full p-1.5 text-muted hover:bg-board hover:text-ink"
              aria-label="Tutup dialog"
            >
              <X size={20} />
            </button>

            {/* Header Dialog */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-brand-tint text-brand">
                <LayoutDashboard size={24} />
              </div>
              <div className="flex flex-col gap-1 pr-6">
                <h2
                  id="exit-modal-title"
                  className="font-display text-[20px] font-bold text-ink"
                >
                  Kembali ke Dashboard?
                </h2>
                <p className="font-display text-[14px] leading-relaxed text-muted">
                  Anda akan keluar dari tampilan layar publik ini dan kembali ke
                  halaman admin instansi.
                </p>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                variant="solid"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin");
                }}
                className="w-full py-3 font-display text-[15px] font-medium"
              >
                Ya, Kembali ke Dashboard
              </Button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-[10px] border border-line bg-board py-2.5 font-display text-[15px] font-medium text-ink transition-colors hover:bg-line"
              >
                Batal / Tetap di Layar Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
