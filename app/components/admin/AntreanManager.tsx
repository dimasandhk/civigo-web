"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "../Button";
import AdjacentQueueCard from "./AdjacentQueueCard";
import DetailField from "./DetailField";
import LoketTab from "./LoketTab";
import type { QueueItem } from "@/lib/data/admin";
import { latestCompleted, sortWaiting } from "@/lib/queue/ordering";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Megaphone } from "lucide-react";

export type AntreanManagerProps = {
  /** Instansi petugas; dipakai untuk channel realtime `display:agency:<id>`. */
  agencyId: number;
  /** Hanya loket aktif — loket nonaktif tidak bisa dipakai memanggil antrean. */
  counters: { id: number; name: string }[];
  initialQueues: QueueItem[];
};

type ApiError = { code: string; message: string };

async function callQueueApi<T>(
  url: string,
  method: "POST" | "PATCH",
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  let payload: { ok?: boolean; error?: ApiError } | null = null;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: "Gagal menghubungi server. Periksa koneksi Anda." },
    };
  }

  if (!payload?.ok) {
    return {
      ok: false,
      error: payload?.error ?? {
        code: "UNKNOWN_ERROR",
        message: "Terjadi kesalahan yang tidak diketahui.",
      },
    };
  }

  return { ok: true, data: payload as T };
}

export default function AntreanManager({
  agencyId,
  counters,
  initialQueues,
}: AntreanManagerProps) {
  const router = useRouter();
  // `null` kalau cabang ini belum punya loket aktif. Dulu jatuh ke id 1, yaitu
  // loket Disdukcapil, sehingga petugas instansi lain memanggil ke loket orang.
  const [selectedCounterId, setSelectedCounterId] = useState<number | null>(
    counters[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Optimistic queue state tied directly to server-rendered initialQueues
  const [queues, setOptimisticQueues] = useOptimistic(
    initialQueues,
    (
      state,
      update: {
        id: string;
        status: string;
        counter_id?: number | null;
        counter_name?: string | null;
        postponed?: boolean;
        postponed_at?: string | null;
        completed_at?: string | null;
      },
    ) =>
      state.map((q) =>
        q.id === update.id
          ? {
              ...q,
              status: update.status,
              counter_id: update.counter_id !== undefined ? update.counter_id : q.counter_id,
              counter_name: update.counter_name !== undefined ? update.counter_name : q.counter_name,
              postponed: update.postponed ?? q.postponed,
              postponed_at: update.postponed_at !== undefined ? update.postponed_at : q.postponed_at,
              completed_at: update.completed_at !== undefined ? update.completed_at : q.completed_at,
            }
          : q,
      ),
  );

  // Realtime: sinyal yang sama dengan layar TV. Trigger `queues_broadcast_to_display`
  // mengirim `queue_changed` ke `display:agency:<id>` setiap antrean hari ini berubah
  // (kios, loket lain, mobile). postgres_changes tidak bisa dipakai: RLS `queues`
  // hanya `auth.uid() = user_id`, jadi petugas tidak pernah menerima tiket warga.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`display:agency:${agencyId}`)
      .on("broadcast", { event: "queue_changed" }, () => {
        router.refresh();
      })
      .subscribe();

    // Jaring pengaman kalau socket putus dan sinyal terlewat.
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [agencyId, router]);

  // Active queue currently being served at the selected counter
  const activeQueue = queues.find(
    (q) => q.counter_id === selectedCounterId && q.status === "served",
  );

  // Tiket yang paling akhir diselesaikan di loket ini (menurut `completed_at`,
  // bukan nomor terbesar — tiket yang dimundurkan selesai belakangan).
  const previousQueue = latestCompleted(
    queues.filter((q) => q.counter_id === selectedCounterId && q.status === "completed"),
  );

  // Next queues in line, in the same order "Panggil Antrean Berikutnya" uses,
  // so the "Selanjutnya" card names the ticket that will actually be called.
  const waitingQueues = sortWaiting(
    queues.filter((q) => ["present", "scheduled"].includes(q.status)),
  );
  const nextInLine = waitingQueues[0];
  const remainingCount = waitingQueues.length;

  const handleComplete = () => {
    if (!activeQueue) return;
    startTransition(async () => {
      setOptimisticQueues({
        id: activeQueue.id,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      const res = await callQueueApi(`/api/queue/${activeQueue.id}/status`, "PATCH", {
        status: "completed",
      });

      if (!res.ok) {
        setActionMessage(res.error.message);
        router.refresh();
        return;
      }

      setActionMessage(`Antrean ${activeQueue.queue_number} berhasil diselesaikan.`);
      router.refresh();
    });
  };

  const handleSkip = () => {
    if (!activeQueue) return;
    startTransition(async () => {
      setOptimisticQueues({ id: activeQueue.id, status: "skipped" });
      const res = await callQueueApi(`/api/queue/${activeQueue.id}/status`, "PATCH", {
        status: "skipped",
      });

      if (!res.ok) {
        setActionMessage(res.error.message);
        router.refresh();
        return;
      }

      setActionMessage(`Antrean ${activeQueue.queue_number} ditandai hangus.`);
      router.refresh();
    });
  };

  const handlePostpone = () => {
    if (!activeQueue) return;
    startTransition(async () => {
      setOptimisticQueues({
        id: activeQueue.id,
        status: "present",
        counter_id: null,
        counter_name: null,
        postponed: true,
        postponed_at: new Date().toISOString(),
      });
      const res = await callQueueApi(`/api/queue/${activeQueue.id}/postpone`, "POST");

      if (!res.ok) {
        setActionMessage(res.error.message);
        router.refresh();
        return;
      }

      setActionMessage(`Antrean ${activeQueue.queue_number} dimundurkan ke urutan paling akhir.`);
      router.refresh();
    });
  };

  const handleCallNext = () => {
    const counterId = selectedCounterId;
    if (counterId === null) return;
    startTransition(async () => {
      const res = await callQueueApi<{
        ticket: { id: string; queue_number: string };
        remaining: number;
      }>("/api/queue/call-next", "POST", { counter_id: counterId });

      if (!res.ok) {
        setActionMessage(res.error.message);
        return;
      }

      const called = res.data.ticket;
      const counterName = counters.find((c) => c.id === counterId)?.name || "Loket";

      setOptimisticQueues({
        id: called.id,
        status: "served",
        counter_id: counterId,
        counter_name: counterName,
      });

      setActionMessage(`Memanggil nomor antrean ${called.queue_number} ke ${counterName}`);

      // Suara panggilan loket otomatis (Text-to-Speech)
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(
            `Nomor antrean ${called.queue_number}, silakan menuju ke ${counterName}`,
          );
          utterance.lang = "id-ID";
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Abaikan jika browser memblokir audio otomatis
        }
      }

      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-[35px]">
      {/* Loket Tabs & Live Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-5 scrollbar-none flex-1">
          {counters.map((counter) => (
            <LoketTab
              key={counter.id}
              label={counter.name}
              isActive={selectedCounterId === counter.id}
              onClick={() => {
                setSelectedCounterId(counter.id);
                setActionMessage(null);
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center rounded-full bg-emerald-50 px-3.5 py-1.5 border border-emerald-200 text-xs font-semibold text-emerald-700 shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Sync Kiosk</span>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-tint/60 px-5 py-3 text-[15px] font-medium text-brand">
          <Megaphone className="size-5 shrink-0 text-brand" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Counter Card */}
      <section className="flex flex-col gap-[30px] rounded-[20px] bg-white p-6 shadow-soft sm:px-10 sm:py-[30px]">
        <div>
          <h2 className="font-display text-[18px] font-semibold text-ink sm:text-[20px]">
            Nomor Antrean Saat Ini —{" "}
            <span className="text-brand">
              {counters.find((c) => c.id === selectedCounterId)?.name ?? "Belum ada loket aktif"}
            </span>
          </h2>

          {counters.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-4 py-8 text-center sm:h-[182px]">
              <span className="font-display text-[32px] font-semibold text-queue-idle/60 sm:text-[40px]">
                Belum Ada Loket Aktif
              </span>
              <p className="max-w-md text-sm text-muted">
                Cabang ini belum punya loket aktif untuk memanggil antrean. Aktifkan atau tambah
                loket di halaman Loket.
              </p>
            </div>
          ) : activeQueue ? (
            <div className="flex min-h-[140px] flex-col items-center justify-between py-2 sm:h-[182px]">
              <span className="font-display text-[72px] leading-none font-semibold text-brand sm:text-[100px] lg:text-[120px]">
                {activeQueue.queue_number}
              </span>
              {/* Tiket walk-in / dynamic pooling tidak punya sesi jam. */}
              {activeQueue.time_block && (
                <span className="font-display text-[16px] font-medium text-queue-idle sm:text-[20px]">
                  Sesi: {activeQueue.time_block}
                </span>
              )}
            </div>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-4 py-8 text-center sm:h-[182px]">
              <span className="font-display text-[32px] font-semibold text-queue-idle/60 sm:text-[40px]">
                {queues.length === 0 ? "Belum Ada Antrean Hari Ini" : "Tidak Ada Antrean"}
              </span>
              <p className="max-w-md text-sm text-muted">
                {queues.length === 0
                  ? "Belum ada tiket yang dipesan untuk hari ini. Antrean akan muncul di sini begitu ada warga yang booking."
                  : remainingCount > 0
                    ? `Loket ini belum memanggil antrean aktif. Ada ${remainingCount} pemohon menunggu — tekan tombol panggil di bawah.`
                    : "Loket ini belum memanggil antrean aktif, dan tidak ada lagi pemohon yang menunggu."}
              </p>
            </div>
          )}
        </div>

        {activeQueue ? (
          <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-between">
            <DetailField label="Nama Lengkap" value={activeQueue.user_name} />
            {/* "No HP" dihapus: tidak ada kolom telepon di skema, jadi yang
                tampil selama ini satu nomor karangan yang sama untuk semua. */}
            <DetailField
              label="Sesi"
              value={activeQueue.time_block ?? "Tanpa sesi"}
              valueClassName="leading-6 tracking-[0.05em]"
            />
            <DetailField
              label="NIK"
              value={activeQueue.user_nik}
              valueClassName="tracking-[0.1em]"
            />
            <DetailField
              label="Layanan"
              value={activeQueue.service_name}
              valueClassName="leading-6 tracking-[0.02em]"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-[30px]">
          {activeQueue ? (
            <>
              <Button
                variant="success"
                className="flex-1 cursor-pointer"
                disabled={isPending}
                onClick={handleComplete}
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  "Selesaikan Layanan"
                )}
              </Button>
              <Button
                variant="warning"
                className="flex-1 cursor-pointer"
                disabled={isPending}
                onClick={handlePostpone}
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  "Mundurkan Antrean"
                )}
              </Button>
              <Button
                variant="danger"
                className="flex-1 cursor-pointer"
                disabled={isPending}
                onClick={handleSkip}
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  "Hanguskan Antrean"
                )}
              </Button>
            </>
          ) : counters.length > 0 ? (
            <Button
              variant="gradient"
              className="w-full cursor-pointer"
              disabled={isPending || remainingCount === 0}
              onClick={handleCallNext}
            >
              {isPending ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : remainingCount > 0 ? (
                "Panggil Antrean Berikutnya"
              ) : (
                "Semua Antrean Telah Dilayani"
              )}
            </Button>
          ) : null}
        </div>
      </section>

      {/* Bottom Summary Cards */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-stretch">
        <AdjacentQueueCard
          muted
          label="Sebelumnya"
          number={previousQueue?.queue_number || "-"}
          name={previousQueue?.user_name || "Belum ada"}
          service={previousQueue?.service_name || "-"}
        />

        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white px-8 py-5 shadow-soft md:px-10">
          <span className="text-center font-display text-[18px] font-medium text-ink sm:text-[20px]">
            Sisa Antrean
          </span>
          <span className="text-center font-display text-[40px] font-semibold text-ink sm:text-[48px]">
            <span className="text-brand">{remainingCount}</span>{" "}
            <span className="text-[18px]">orang</span>
          </span>
        </div>

        <AdjacentQueueCard
          label="Selanjutnya"
          number={nextInLine?.queue_number || "-"}
          name={nextInLine?.user_name || "Tidak ada antrean"}
          service={nextInLine?.service_name || "-"}
          tag={nextInLine?.postponed ? "Dimundurkan" : undefined}
        />
      </div>
    </div>
  );
}
