"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { ServiceDocumentItem, ServiceDocumentType } from "@/lib/data/admin";

export type ServiceDocumentPickerProps = {
  label: string;
  hint?: string;
  catalog: ServiceDocumentItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Tambah dokumen baru ke katalog; resolve ke dokumennya kalau berhasil. */
  onCreate: (name: string, type: ServiceDocumentType) => Promise<ServiceDocumentItem | null>;
  /**
   * Warna chip: hijau untuk output, abu-abu untuk prasyarat. Kondisi (mis.
   * "Berusia 17 Tahun") hanya bisa dipilih dan dibuat di pemilih prasyarat.
   */
  tone: "output" | "requirement";
};

const CHIP_TONES = {
  output: "border-emerald-200 bg-emerald-50 text-emerald-800",
  requirement: "border-slate-200 bg-slate-50 text-slate-700",
};

const CREATE_BUTTON =
  "flex w-fit cursor-pointer items-center gap-1.5 rounded-[10px] border border-dashed border-brand px-3 py-1.5 font-display text-xs font-semibold text-brand hover:bg-brand/5 disabled:opacity-60";

export const CONDITION_CHIP = "border-amber-200 bg-amber-50 text-amber-800";

/** Label kecil penanda kondisi; warna saja tidak cukup untuk membedakannya. */
export function ConditionTag() {
  return (
    <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
      Kondisi
    </span>
  );
}

export default function ServiceDocumentPicker({
  label,
  hint,
  catalog,
  selectedIds,
  onChange,
  onCreate,
  tone,
}: ServiceDocumentPickerProps) {
  const filterId = useId();
  const [filter, setFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const allowConditions = tone === "requirement";
  const byId = useMemo(() => new Map(catalog.map((doc) => [doc.id, doc])), [catalog]);
  const selectable = useMemo(
    () => (allowConditions ? catalog : catalog.filter((doc) => doc.type === "dokumen")),
    [catalog, allowConditions],
  );

  const trimmed = filter.trim();
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return selectable;
    return selectable.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        (doc.description ?? "").toLowerCase().includes(q),
    );
  }, [selectable, trimmed]);

  // Dicek ke seluruh katalog, bukan hanya yang bisa dipilih: nama unik global,
  // jadi kondisi bernama sama tidak boleh ditawarkan untuk dibuat lagi.
  const exactMatch = catalog.find(
    (doc) => doc.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const hiddenCondition = !allowConditions && exactMatch?.type === "kondisi";

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  };

  const handleCreate = async (type: ServiceDocumentType) => {
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    const created = await onCreate(trimmed, type);
    setIsCreating(false);
    if (!created) return;
    // Nama yang sama bisa saja baru dibuat orang lain sebagai kondisi.
    if (allowConditions || created.type === "dokumen") {
      if (!selectedIds.includes(created.id)) onChange([...selectedIds, created.id]);
      setFilter("");
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 font-display text-xs font-semibold uppercase tracking-wider text-ink">
        {label}
      </legend>
      {hint && <p className="-mt-1 font-display text-xs text-queue-idle">{hint}</p>}

      <div className="flex min-h-[34px] flex-wrap gap-1.5">
        {selectedIds.length === 0 ? (
          <span className="font-display text-sm text-muted">Belum ada dokumen dipilih.</span>
        ) : (
          selectedIds.map((id) => (
            <span
              key={id}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                byId.get(id)?.type === "kondisi" ? CONDITION_CHIP : CHIP_TONES[tone]
              }`}
            >
              {byId.get(id)?.type === "kondisi" && <ConditionTag />}
              {byId.get(id)?.name ?? `Dokumen #${id}`}
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={`Hapus ${byId.get(id)?.name ?? id} dari ${label}`}
                className="cursor-pointer rounded-sm opacity-70 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      <label htmlFor={filterId} className="sr-only">
        Cari dokumen untuk {label}
      </label>
      <input
        id={filterId}
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          // Enter di sini jangan men-submit form layanan.
          if (e.key === "Enter") {
            e.preventDefault();
            if (!exactMatch) void handleCreate("dokumen");
          }
        }}
        placeholder={
          allowConditions
            ? "Cari atau ketik nama dokumen/kondisi baru..."
            : "Cari atau ketik nama dokumen baru..."
        }
        className="w-full rounded-[12px] border border-line bg-board/40 px-3.5 py-2 font-display text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />

      <ul className="max-h-40 overflow-y-auto rounded-[12px] border border-line">
        {matches.map((doc) => (
          <li key={doc.id} className="border-b border-line/60 last:border-b-0">
            <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-board/50">
              <input
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggle(doc.id)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
              />
              <span className="flex flex-col">
                <span className="flex items-center gap-1.5 font-display text-sm font-medium text-ink">
                  {doc.name}
                  {doc.type === "kondisi" && <ConditionTag />}
                </span>
                {doc.description && (
                  <span className="font-display text-xs text-queue-idle">{doc.description}</span>
                )}
              </span>
            </label>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-3 py-2 font-display text-sm text-muted">
            {hiddenCondition
              ? `"${exactMatch.name}" ada di katalog sebagai kondisi, jadi tidak bisa menjadi dokumen output.`
              : "Tidak ada dokumen yang cocok."}
          </li>
        )}
      </ul>

      {trimmed && !exactMatch && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCreate("dokumen")}
            disabled={isCreating}
            className={CREATE_BUTTON}
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Tambah &quot;{trimmed}&quot; {allowConditions ? "sebagai dokumen" : "ke katalog dokumen"}
          </button>
          {allowConditions && (
            <button
              type="button"
              onClick={() => handleCreate("kondisi")}
              disabled={isCreating}
              className={CREATE_BUTTON}
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Tambah sebagai kondisi
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
