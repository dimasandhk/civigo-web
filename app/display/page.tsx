import type { Metadata } from "next";

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
    <main className="min-h-screen bg-board px-14 py-[31px]">
      <div className="mx-auto flex max-w-[1167px] flex-col gap-[55px]">
        <header className="flex items-center justify-between">
          <h1 className="text-[48px] font-extrabold leading-[60px] text-ink">
            Antrean DisdukCapil
          </h1>
          <p className="text-[28px] font-bold leading-[35px] tracking-[0.04em] text-ink">
            Jumat, 15 Agustus 2026
          </p>
        </header>

        <section className="flex items-center gap-[29px]">
          {COUNTERS.map(({ counter, nowServing, eta }) => (
            <article
              key={counter}
              className="flex w-[270px] flex-col items-center gap-5 rounded-[30px] bg-linear-to-b from-counter-top to-counter-bottom p-[30px] font-display text-white shadow-inset-soft"
            >
              <h2 className="text-[32px] font-medium leading-10">{counter}</h2>
              <div className="flex h-[180px] w-full flex-col justify-between">
                <div className="flex flex-col items-center">
                  <span className="text-[72px] font-bold leading-[91px]">
                    {nowServing}
                  </span>
                  <span className="text-[20px] font-medium leading-[25px]">
                    Sedang dilayani
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[15px] leading-[19px]">
                    Estimasi Selesai :
                  </span>
                  <span className="text-[22px] font-semibold leading-6">
                    {eta}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-[35px]">
          <h2 className="text-[32px] font-bold leading-10 text-ink">
            Antrean Berikutnya
          </h2>
          <ol className="grid grid-cols-5 gap-x-10 gap-y-5">
            {UPCOMING.map((number, index) => (
              <li
                key={`${number}-${index}`}
                className="flex flex-col items-center justify-center rounded-[20px] bg-queue-idle py-5 font-display text-white shadow-inset-soft"
              >
                <span className="text-[50px] font-semibold leading-[63px]">
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
