import type { Metadata } from "next";
import BackButton from "../../components/display/BackButton";

export const metadata: Metadata = {
  title: "Pindai Kode Antrean — CiviGo",
};

export default function InputCodePage() {
  return (
    <main className="relative flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden bg-board px-6 py-4 sm:px-10 sm:py-6 lg:px-14">
      {/* Tombol Kembali ke Kiosk Menu */}
      <BackButton
        href="/display"
        className="absolute top-4 left-4 sm:top-6 sm:left-8"
      />

      <div className="flex w-full max-w-[900px] flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-7">
        {/* Header */}
        <header className="flex flex-col items-center gap-1 sm:gap-2 text-center">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px] font-semibold leading-tight text-ink">
            Pindai Kode Antrean
          </h1>
          <p className="font-display text-base sm:text-lg lg:text-[22px] font-medium text-brand">
            QR Code dapat ditemukan pada tiket antrean Anda
          </p>
        </header>

        {/* Scan Area Box */}
        <section className="flex flex-col items-center gap-2 sm:gap-3">
          <h2 className="font-display text-base sm:text-xl lg:text-[22px] font-semibold text-ink">
            Arahkan QR Code Anda ke kamera
          </h2>
          <div className="flex h-[180px] w-[200px] sm:h-[220px] sm:w-[240px] lg:h-[240px] lg:w-[260px] items-center justify-center rounded-[12px] bg-[#A1A1AA] p-4 shadow-soft">
            <span className="text-center font-display text-2xl sm:text-[28px] font-semibold leading-tight whitespace-pre-line text-white/80">
              {"SCAN\nAREA"}
            </span>
          </div>
        </section>

        {/* Manual Code Input */}
        <section className="flex w-full flex-col items-center gap-2 sm:gap-3">
          <h2 className="font-display text-base sm:text-xl lg:text-[22px] font-semibold text-ink">
            Atau Masukkan Kode secara Manual
          </h2>
          <label htmlFor="code" className="sr-only">
            Kode antrean
          </label>
          <input
            id="code"
            name="code"
            type="text"
            placeholder="Masukkan Kode"
            className="w-full max-w-[420px] rounded-[16px] bg-white px-5 py-3 sm:py-3.5 text-center font-display text-lg sm:text-xl font-medium text-ink shadow-card outline-none placeholder:text-queue-idle focus-visible:ring-2 focus-visible:ring-counter-top/30"
          />
        </section>
      </div>
    </main>
  );
}
