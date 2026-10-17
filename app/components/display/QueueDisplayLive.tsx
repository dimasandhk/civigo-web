"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ExitToAdminButton from "./ExitToAdminButton";
import { announceQueueCall, playChime } from "./queueAudio";

export type CounterDisplay = {
  counter: string;
  nowServing: string;
  eta: string;
};

export type QueueDisplayLiveProps = {
  agencyId: number;
  initialCounters: CounterDisplay[];
  initialUpcoming: string[];
  agencyName?: string;
};

export default function QueueDisplayLive({
  agencyId,
  initialCounters: counters,
  initialUpcoming: upcoming,
  agencyName = "DisdukCapil",
}: QueueDisplayLiveProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevServingRef = useRef<Record<string, string>>({});

  const toggleAudio = () => {
    if (!audioEnabled) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }
          audioCtxRef.current = ctx;
          playChime(ctx);
        }
      } catch {
        // Fallback
      }
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

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

  // Announce newly called numbers on display
  useEffect(() => {
    counters.forEach(({ counter, nowServing }) => {
      const prev = prevServingRef.current[counter];
      if (
        nowServing &&
        nowServing !== "-" &&
        nowServing !== prev &&
        prev !== undefined &&
        audioEnabled
      ) {
        announceQueueCall(nowServing, counter, audioCtxRef.current);
      }
      prevServingRef.current[counter] = nowServing;
    });
  }, [counters, audioEnabled]);

  // Realtime: trigger `queues_broadcast_to_display` broadcasts a content-free
  // signal per agency. postgres_changes cannot be used here — the TV is anon
  // and RLS on `queues` hides every row from anon, so it would get no events.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`display:agency:${agencyId}`)
      .on("broadcast", { event: "queue_changed" }, () => {
        router.refresh();
      })
      .subscribe();

    // Safety net in case the socket drops and misses a signal.
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [agencyId, router]);

  return (
    <main className="relative flex h-screen max-h-screen flex-col justify-between overflow-hidden bg-board px-6 py-5 sm:px-10 sm:py-6 lg:px-14 lg:py-7">
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-between gap-5 sm:gap-6">
        {/* Header Display */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-extrabold leading-tight text-ink">
            Antrean {agencyName}
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Audio Voice Call Toggle */}
            <button
              type="button"
              onClick={toggleAudio}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                audioEnabled
                  ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  : "bg-white/80 text-ink/70 border border-line shadow-xs hover:bg-white hover:text-ink"
              }`}
              title={audioEnabled ? "Panggilan suara aktif" : "Klik untuk mengaktifkan panggilan suara"}
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="hidden sm:inline">Panggilan Suara Aktif</span>
                  <span className="sm:hidden">Suara Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-queue-idle" />
                  <span className="hidden sm:inline">Aktifkan Suara</span>
                  <span className="sm:hidden">Suara Mati</span>
                </>
              )}
            </button>

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
