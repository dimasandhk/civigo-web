import type { Metadata } from "next";
import ExitToAdminButton from "../../components/display/ExitToAdminButton";

export const metadata: Metadata = {
  title: "Antrean DisdukCapil",
};

const COUNTERS = [
  { counter: "Loket 5", nowServing: "B45", eta: "± 5 menit" },
  { counter: "Loket 6", nowServing: "B47", eta: "± 8 menit" },
  { counter: "Loket 7", nowServing: "B48", eta: "± 7 menit" },
  { counter: "Loket 8", nowServing: "B46", eta: "± 2 menit" },
];

const UPCOMING = [
  "B49",
  "B50",
  "B51",
  "B52",
  "B53",
  "B54",
  "B55",
  "B55",
  "B56",
  "B57",
];

export default function QueueDisplayPage() {
  return (
    <main className="relative flex h-screen max-h-screen flex-col justify-between overflow-hidden bg-board px-6 py-5 sm:px-10 sm:py-6 lg:px-14 lg:py-7">
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-between gap-5 sm:gap-6">
        {/* Header Display */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-extrabold leading-tight text-ink">
            Antrean DisdukCapil
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="font-display text-base sm:text-xl lg:text-[24px] font-bold tracking-[0.03em] text-ink">
              Jumat, 15 Agustus 2026
            </p>
            <ExitToAdminButton className="static" />
          </div>
        </header>

        {/* 4 Loket Aktif */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5 lg:gap-6">
          {COUNTERS.map(({ counter, nowServing, eta }) => (
            <article
              key={counter}
              className="flex flex-col items-center justify-between gap-3 rounded-[24px] bg-linear-to-b from-counter-top to-counter-bottom p-5 sm:p-6 font-display text-white shadow-inset-soft"
            >
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-medium">
                {counter}
              </h2>
              <div className="flex w-full flex-col items-center gap-1">
                <span className="text-5xl sm:text-6xl lg:text-[72px] font-bold leading-none">
                  {nowServing}
                </span>
                <span className="text-sm sm:text-base font-medium opacity-90">
                  Sedang dilayani
                </span>
              </div>
              <div className="flex w-full items-center justify-between border-t border-white/20 pt-2 text-xs sm:text-sm">
                <span>Estimasi Selesai :</span>
                <span className="font-semibold text-base sm:text-lg">
                  {eta}
                </span>
              </div>
            </article>
          ))}
        </section>

        {/* Antrean Berikutnya */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl sm:text-2xl lg:text-[26px] font-bold text-ink">
            Antrean Berikutnya
          </h2>
          <ol className="grid grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5">
            {UPCOMING.map((number, index) => (
              <li
                key={`${number}-${index}`}
                className="flex items-center justify-center rounded-[16px] bg-queue-idle py-3.5 sm:py-4 font-display text-white shadow-inset-soft"
              >
                <span className="text-2xl sm:text-3xl lg:text-[40px] font-semibold leading-none">
                  {number}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
