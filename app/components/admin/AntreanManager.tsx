"use client";

import { useState, useTransition } from "react";
import Button from "../Button";
import AdjacentQueueCard from "./AdjacentQueueCard";
import DetailField from "./DetailField";
import LoketTab from "./LoketTab";
import { completeQueue, skipQueue, callNextQueue } from "@/lib/data/queue-actions";
import type { QueueItem } from "@/lib/data/admin";
import { Loader2, Megaphone } from "lucide-react";

export type AntreanManagerProps = {
  counters: { id: number; name: string }[];
  initialQueues: QueueItem[];
};

export default function AntreanManager({
  counters,
  initialQueues,
}: AntreanManagerProps) {
  const [selectedCounterId, setSelectedCounterId] = useState<number>(
    counters[0]?.id ?? 1,
  );
  const [queues, setQueues] = useState<QueueItem[]>(initialQueues);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Active queue currently being served at the selected counter
  const activeQueue = queues.find(
    (q) => q.counter_id === selectedCounterId && q.status === "served",
  );

  // Previously completed queue at this counter
  const previousQueue = queues
    .filter((q) => q.counter_id === selectedCounterId && q.status === "completed")
    .slice(-1)[0];

  // Next queues in line (present or scheduled, not yet assigned counter)
  const waitingQueues = queues.filter((q) =>
    ["present", "scheduled"].includes(q.status),
  );
  const nextInLine = waitingQueues[0];
  const remainingCount = waitingQueues.length;

  const handleComplete = () => {
    if (!activeQueue) return;
    startTransition(async () => {
      const res = await completeQueue(activeQueue.id);
      if (res.success) {
        setQueues((prev) =>
          prev.map((q) =>
            q.id === activeQueue.id ? { ...q, status: "completed" } : q,
          ),
        );
        setActionMessage(`Antrean ${activeQueue.queue_number} berhasil diselesaikan.`);
      }
    });
  };

  const handleSkip = () => {
    if (!activeQueue) return;
    startTransition(async () => {
      const res = await skipQueue(activeQueue.id);
      if (res.success) {
        setQueues((prev) =>
          prev.map((q) =>
            q.id === activeQueue.id ? { ...q, status: "skipped" } : q,
          ),
        );
        setActionMessage(`Antrean ${activeQueue.queue_number} ditandai hangus.`);
      }
    });
  };

  const handleCallNext = () => {
    startTransition(async () => {
      const res = await callNextQueue(selectedCounterId, 1);
      if (res.success && res.queueNumber) {
        setQueues((prev) => {
          let updated = false;
          return prev.map((q) => {
            if (!updated && ["present", "scheduled"].includes(q.status)) {
              updated = true;
              return {
                ...q,
                status: "served",
                counter_id: selectedCounterId,
                counter_name:
                  counters.find((c) => c.id === selectedCounterId)?.name || null,
              };
            }
            return q;
          });
        });
        setActionMessage(`Memanggil nomor antrean ${res.queueNumber}`);
      } else if (res.error) {
        setActionMessage(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-[35px]">
      {/* Loket Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-5 scrollbar-none">
        {counters.map((counter) => (
          <button
            key={counter.id}
            type="button"
            onClick={() => {
              setSelectedCounterId(counter.id);
              setActionMessage(null);
            }}
            className="cursor-pointer focus:outline-none"
          >
            <LoketTab
              label={counter.name}
              isActive={selectedCounterId === counter.id}
            />
          </button>
        ))}
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
              {counters.find((c) => c.id === selectedCounterId)?.name ||
                `Loket ${selectedCounterId}`}
            </span>
          </h2>

          {activeQueue ? (
            <div className="flex min-h-[140px] flex-col items-center justify-between py-2 sm:h-[182px]">
              <span className="font-display text-[72px] leading-none font-semibold text-brand sm:text-[100px] lg:text-[120px]">
                {activeQueue.queue_number}
              </span>
              <span className="font-display text-[16px] font-medium text-queue-idle sm:text-[20px]">
                Sesi: {activeQueue.time_block}
              </span>
            </div>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-4 py-8 text-center sm:h-[182px]">
              <span className="font-display text-[32px] font-semibold text-queue-idle/60 sm:text-[40px]">
                Tidak Ada Antrean
              </span>
              <p className="max-w-md text-sm text-muted">
                Loket ini belum memanggil antrean aktif. Tekan tombol panggil di bawah untuk melayani pemohon berikutnya.
              </p>
            </div>
          )}
        </div>

        {activeQueue ? (
          <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-between">
            <DetailField label="Nama Lengkap" value={activeQueue.user_name} />
            <DetailField
              label="No HP"
              value={activeQueue.user_phone}
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
          ) : (
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
          )}
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
        />
      </div>
    </div>
  );
}
