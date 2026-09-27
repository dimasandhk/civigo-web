"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import FilterSelect, { type FilterSelectOption } from "../FilterSelect";

type FilterKey = "layanan" | "loket" | "rating";

export type ReviewFiltersProps = {
  serviceOptions: FilterSelectOption[];
  counterOptions: FilterSelectOption[];
  ratingOptions: FilterSelectOption[];
  /** Nilai aktif dari URL; string kosong berarti "Semua". */
  current: Record<FilterKey, string>;
};

/**
 * Filter halaman ulasan disimpan di URL (`?layanan=1&loket=2&rating=5`), jadi
 * halaman server yang menyaring datanya dan tautannya bisa dibagikan.
 */
export default function ReviewFilters({
  serviceOptions,
  counterOptions,
  ratingOptions,
  current,
}: ReviewFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const update = (key: FilterKey, value: string) => {
    const next = { ...current, [key]: value };
    const params = new URLSearchParams();
    for (const [name, val] of Object.entries(next)) {
      if (val) params.set(name, val);
    }
    const query = params.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const hasFilter = Object.values(current).some(Boolean);

  return (
    <div
      aria-busy={isPending}
      className={`flex flex-col gap-4 transition-opacity sm:flex-row sm:flex-wrap sm:items-center lg:justify-between lg:gap-5 ${isPending ? "opacity-60" : ""}`}
    >
      <FilterSelect
        id="filter-layanan"
        label="Saring menurut layanan"
        options={serviceOptions}
        value={current.layanan}
        onChange={(e) => update("layanan", e.target.value)}
        containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
      />
      <FilterSelect
        id="filter-loket"
        label="Saring menurut loket"
        options={counterOptions}
        value={current.loket}
        onChange={(e) => update("loket", e.target.value)}
        containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
      />
      <FilterSelect
        id="filter-rating"
        label="Saring menurut rating"
        options={ratingOptions}
        value={current.rating}
        onChange={(e) => update("rating", e.target.value)}
        containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
      />
      {hasFilter && (
        <button
          type="button"
          onClick={() =>
            startTransition(() => router.replace(pathname, { scroll: false }))
          }
          className="cursor-pointer font-display text-sm font-semibold text-brand hover:underline"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}
