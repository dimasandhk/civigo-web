import type { Metadata } from "next";
import BackButton from "../../components/display/BackButton";

export const metadata: Metadata = {
  title: "Pindai Kode Antrean — CiviGo",
};

export default function InputCodePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-board px-14 py-[63px]">
      <BackButton href="/display" className="absolute top-[30px] left-[50px]" />

      <div className="flex w-full max-w-[1167px] flex-col items-center gap-[50px]">
        <header className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="font-display text-[40px] font-semibold leading-[50px] text-ink">
            Pindai Kode Antrean
          </h1>
          <p className="font-display text-[28px] font-medium leading-[35px] text-brand">
            QR Code dapat ditemukan pada tiket antrean Anda
          </p>
        </header>

        <section className="flex flex-col items-center gap-5">
          <h2 className="font-display text-[30px] font-semibold leading-[38px] text-ink">
            Arahkan QR Code Anda ke kamera
          </h2>
          <div className="flex h-[331px] w-[348px] items-center justify-center rounded-[10px] bg-[#A1A1AA] p-5">
            <span className="text-center font-display text-[32px] font-semibold leading-10 whitespace-pre-line text-muted">
              {"SCAN\nAREA"}
            </span>
          </div>
        </section>

        <section className="flex flex-col items-center gap-5">
          <h2 className="font-display text-[30px] font-semibold leading-[38px] text-ink">
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
            className="w-full rounded-[20px] bg-white px-5 py-5 text-center font-display text-[24px] leading-6 text-ink shadow-card outline-none placeholder:text-queue-idle focus-visible:ring-2 focus-visible:ring-counter-top/25"
          />
        </section>
      </div>
    </main>
  );
}
