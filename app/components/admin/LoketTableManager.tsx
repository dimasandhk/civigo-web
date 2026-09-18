"use client";

import { useId, useMemo, useOptimistic, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import Button from "../Button";
import DataTable, { type DataTableColumn } from "../DataTable";
import IconButton from "../IconButton";
import SearchBar from "../SearchBar";
import StatusBadge, { type Status } from "../StatusBadge";
import {
  createCounterAction,
  deleteCounterAction,
  toggleCounterStatusAction,
  updateCounterNameAction,
} from "@/lib/data/counter-actions";

export type LoketItem = {
  id: number;
  name: string;
  status: Status;
  days: string;
  hours: string;
  createdDate: string;
  createdTime: string;
};

const SUBTEXT = "text-[16px] tracking-[0.02em] text-ink-soft";

export default function LoketTableManager({
  initialCounters,
}: {
  initialCounters: LoketItem[];
}) {
  const addInputId = useId();
  const editInputId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const [counters, setOptimisticCounters] = useOptimistic(
    initialCounters,
    (state, update: { id: number; status: Status }) =>
      state.map((c) => (c.id === update.id ? { ...c, status: update.status } : c)),
  );

  // Notification feedback
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCounterName, setNewCounterName] = useState("");

  const [editingCounter, setEditingCounter] = useState<LoketItem | null>(null);
  const [editName, setEditName] = useState("");

  const [deletingCounter, setDeletingCounter] = useState<LoketItem | null>(null);

  const filteredCounters = useMemo(() => {
    if (!searchQuery.trim()) return counters;
    const q = searchQuery.toLowerCase();
    return counters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.days.toLowerCase().includes(q),
    );
  }, [counters, searchQuery]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleToggleStatus = (loket: LoketItem) => {
    const nextStatus: Status = loket.status === "aktif" ? "nonaktif" : "aktif";

    startTransition(async () => {
      setOptimisticCounters({ id: loket.id, status: nextStatus });
      const res = await toggleCounterStatusAction(loket.id, loket.status);
      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal mengubah status loket.");
      } else {
        showNotification("success", res.message ?? "Status loket diperbarui.");
      }
    });
  };

  const handleCreateCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounterName.trim()) return;

    startTransition(async () => {
      const res = await createCounterAction(newCounterName.trim());
      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal menambahkan loket.");
      } else {
        showNotification("success", res.message ?? "Loket baru berhasil ditambahkan.");
        setIsAddOpen(false);
        setNewCounterName("");
      }
    });
  };

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter || !editName.trim()) return;

    startTransition(async () => {
      const res = await updateCounterNameAction(editingCounter.id, editName.trim());
      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal mengubah nama loket.");
      } else {
        showNotification("success", res.message ?? "Nama loket berhasil diperbarui.");
        setEditingCounter(null);
      }
    });
  };

  const handleDeleteCounter = () => {
    if (!deletingCounter) return;

    startTransition(async () => {
      const res = await deleteCounterAction(deletingCounter.id);
      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal menghapus loket.");
      } else {
        showNotification("success", res.message ?? "Loket berhasil diproses.");
        setDeletingCounter(null);
      }
    });
  };

  const columns: DataTableColumn<LoketItem>[] = [
    { header: "Nama Loket", width: "22%", cell: (loket) => loket.name },
    {
      header: "Status",
      width: "20%",
      cell: (loket) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(loket)}
          disabled={isPending}
          title="Klik untuk mengubah status aktif/nonaktif"
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <StatusBadge status={loket.status} />
        </button>
      ),
    },
    {
      header: "Jadwal Buka",
      width: "24%",
      cell: (loket) => (
        <>
          {loket.days}
          <br />
          <span className={SUBTEXT}>{loket.hours}</span>
        </>
      ),
    },
    {
      header: "Dibuat Pada",
      width: "18%",
      cell: (loket) => (
        <>
          {loket.createdDate}
          <br />
          <span className={SUBTEXT}>{loket.createdTime}</span>
        </>
      ),
    },
    {
      header: "Aksi",
      width: "16%",
      cell: (loket) => (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Toggle status icon */}
          <IconButton
            onClick={() => handleToggleStatus(loket)}
            aria-label={`Ubah status ${loket.name}`}
            title={loket.status === "aktif" ? "Tutup Loket (Nonaktifkan)" : "Buka Loket (Aktifkan)"}
            className={loket.status === "aktif" ? "hover:text-amber-600" : "hover:text-emerald-600"}
          >
            <Power size={20} className={loket.status === "aktif" ? "text-emerald-600" : "text-zinc-400"} />
          </IconButton>

          {/* Edit icon */}
          <IconButton
            onClick={() => {
              setEditingCounter(loket);
              setEditName(loket.name);
            }}
            aria-label={`Ubah nama ${loket.name}`}
            title="Ubah Nama Loket"
          >
            <Pencil size={20} />
          </IconButton>

          {/* Delete icon */}
          <IconButton
            onClick={() => setDeletingCounter(loket)}
            aria-label={`Hapus ${loket.name}`}
            title="Hapus Loket"
            className="hover:text-red-600"
          >
            <Trash2 size={20} className="text-zinc-500 hover:text-red-600" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-soft animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-[30px]">
        <SearchBar
          id="cari-loket"
          label="Cari loket"
          size="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama loket atau status..."
          containerClassName="flex-1"
        />
        <Button
          variant="solid"
          onClick={() => setIsAddOpen(true)}
          className="w-full sm:w-[205px] cursor-pointer"
        >
          <Plus size={24} className="shrink-0" />
          Tambah Loket
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filteredCounters}
        rowKey={(loket) => String(loket.id)}
      />

      {/* Modal: Tambah Loket Baru */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex w-full max-w-[460px] flex-col gap-5 rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                Tambah Loket Baru
              </h2>
              <p className="font-display text-xs text-queue-idle mt-0.5">
                Loket baru akan langsung berstatus Aktif dan siap melayani antrean.
              </p>
            </div>

            <form onSubmit={handleCreateCounter} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={addInputId}
                  className="font-display text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  Nama Loket
                </label>
                <input
                  id={addInputId}
                  type="text"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  placeholder="Contoh: Loket 9 (Layanan Prioritas)"
                  required
                  autoFocus
                  className="w-full rounded-[12px] border border-line bg-board/40 px-3.5 py-2.5 font-display text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 rounded-[12px] border border-line py-2.5 font-display text-sm font-semibold text-ink hover:bg-board cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newCounterName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-brand py-2.5 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Simpan Loket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah Nama Loket */}
      {editingCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex w-full max-w-[460px] flex-col gap-5 rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setEditingCounter(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                Ubah Nama Loket
              </h2>
              <p className="font-display text-xs text-queue-idle mt-0.5">
                Perbarui identitas atau nama loket pelayanan.
              </p>
            </div>

            <form onSubmit={handleUpdateName} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={editInputId}
                  className="font-display text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  Nama Loket
                </label>
                <input
                  id={editInputId}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-[12px] border border-line bg-board/40 px-3.5 py-2.5 font-display text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCounter(null)}
                  className="flex-1 rounded-[12px] border border-line py-2.5 font-display text-sm font-semibold text-ink hover:bg-board cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !editName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-brand py-2.5 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      {deletingCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex w-full max-w-[420px] flex-col gap-4 rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 size={24} />
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Hapus &quot;{deletingCounter.name}&quot;?
              </h2>
              <p className="font-display text-xs text-queue-idle mt-1 leading-relaxed">
                Jika loket ini memiliki riwayat panggilan tiket antrean sebelumnya, loket akan secara otomatis dinonaktifkan demi menjaga keutuhan riwayat data antrean.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCounter(null)}
                className="flex-1 rounded-[12px] border border-line py-2.5 font-display text-sm font-semibold text-ink hover:bg-board cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCounter}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-red-600 py-2.5 font-display text-sm font-semibold text-white shadow-soft hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
