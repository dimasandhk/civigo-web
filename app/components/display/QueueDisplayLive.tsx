"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExitToAdminButton from "./ExitToAdminButton";

export type CounterDisplay = {
  counter: string;
  nowServing: string;
  eta: string;
};

export type QueueDisplayLiveProps = {
  initialCounters: CounterDisplay[];
  initialUpcoming: string[];
  agencyName?: string;
};

export default function QueueDisplayLive({
  initialCounters: counters,
  initialUpcoming: upcoming,
  agencyName = "DisdukCapil",
}: QueueDisplayLiveProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");

  // Dynamic Indonesian date
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now);
      setCurrentDate(formatted);
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime Subscription for Queues
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("public:queues-display")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queues",
        },
        () => {
          // Re-fetch data from server
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <main className="relative flex h-screen max-h-screen flex-col justify-between overflow-hidden bg-board px-6 py-5 sm:px-10 sm:py-6 lg:px-14 lg:py-7">
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-between gap-5 sm:gap-6">
        {/* Header Display */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-extrabold leading-tight text-ink">
            Antrean {agencyName}
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="font-display text-base sm:text-xl lg:text-[24px] font-bold tracking-[0.03em] text-ink">
              {currentDate || "Memuat tanggal..."}
            </p>
            <ExitToAdminButton className="static" />
          </div>
        </header>

        {/* 4 Loket Utama */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5 lg:gap-6">
          {counters.map(({ counter, nowServing, eta }) => (
            <article
              key={counter}
              className="flex flex-col items-center justify-between gap-3 rounded-[24px] bg-linear-to-b from-counter-top to-counter-bottom p-5 sm:p-6 font-display text-white shadow-inset-soft transition-transform duration-300 hover:scale-[1.02]"
            >
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-medium">
                {counter}
              </h2>
              <div className="flex w-full flex-col items-center gap-1">
                <span className="text-5xl sm:text-6xl lg:text-[72px] font-bold leading-none tracking-tight">
                  {nowServing}
                </span>
                <span className="text-sm sm:text-base font-medium opacity-90">
                  {nowServing === "-" ? "Menunggu Panggilan" : "Sedang dilayani"}
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
            {upcoming.length > 0 ? (
              upcoming.slice(0, 10).map((number, index) => (
                <li
                  key={`${number}-${index}`}
                  className="flex items-center justify-center rounded-[16px] bg-queue-idle py-3.5 sm:py-4 font-display text-white shadow-inset-soft"
                >
                  <span className="text-2xl sm:text-3xl lg:text-[40px] font-semibold leading-none">
                    {number}
                  </span>
                </li>
              ))
            ) : (
              <li className="col-span-5 flex items-center justify-center rounded-[16px] bg-white/80 py-4 font-display text-muted shadow-soft">
                <span>Belum ada antrean berikutnya yang terdaftar</span>
              </li>
            )}
          </ol>
        </section>
      </div>
    </main>
  );
}
