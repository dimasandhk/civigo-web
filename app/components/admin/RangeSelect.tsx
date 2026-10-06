"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DATE_RANGE_OPTIONS, type DateRange } from "@/lib/queue/time";

export type RangeSelectProps = {
  /** Nama parameter URL untuk kartu ini, mis. `kehadiran`. */
  param: string;
  /** Rentang aktif kartu ini. */
  value: DateRange;
  /** Semua parameter rentang di halaman, supaya kartu lain tidak ikut berubah. */
  current: Record<string, DateRange>;
  /** Label untuk pembaca layar, mis. "Rentang tingkat kehadiran". */
  label: string;
};

/**
 * Dropdown rentang waktu (Hari ini / Minggu ini / Bulan ini) untuk satu kartu Beranda.
 * Disimpan di URL seperti filter halaman Ulasan, jadi server yang menghitung datanya
 * dan tampilan bertahan saat di-refresh atau dibagikan.
 */
export default function RangeSelect({ param, value, current, label }: RangeSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const id = `range-${param}`;

  const update = (next: string) => {
    const params = new URLSearchParams();
    for (const [name, val] of Object.entries({ ...current, [param]: next })) {
      params.set(name, val);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={`relative transition-opacity ${isPending ? "opacity-60" : ""}`} aria-busy={isPending}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => update(e.target.value)}
        className="cursor-pointer appearance-none rounded-md bg-transparent py-0.5 pr-5 pl-1 font-display text-[13px] text-queue-idle outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-counter-top"
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2 text-queue-idle"
      />
    </div>
  );
}
