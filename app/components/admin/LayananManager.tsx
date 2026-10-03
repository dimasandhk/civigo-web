"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Button from "../Button";
import DataTable, { type DataTableColumn } from "../DataTable";
import IconButton from "../IconButton";
import SearchBar from "../SearchBar";
import ServiceDocumentPicker, { CONDITION_CHIP, ConditionTag } from "./ServiceDocumentPicker";
import type {
  AdminServiceItem,
  ServiceDocumentItem,
  ServiceDocumentType,
} from "@/lib/data/admin";
import {
  createServiceAction,
  createServiceDocumentAction,
  deleteServiceAction,
  updateServiceAction,
  type ServiceInput,
} from "@/lib/data/service-actions";

type Notification = { type: "success" | "error"; message: string };

const FIELD_LABEL =
  "font-display text-xs font-semibold uppercase tracking-wider text-ink";
const FIELD_INPUT =
  "w-full rounded-[12px] border border-line bg-board/40 px-3.5 py-2.5 font-display text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand";
const OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in";
const CLOSE_BUTTON =
  "absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer";
const SECONDARY_BUTTON =
  "flex-1 rounded-[12px] border border-line py-2.5 font-display text-sm font-semibold text-ink hover:bg-board cursor-pointer";
const PRIMARY_BUTTON =
  "flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-brand py-2.5 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 disabled:opacity-60 cursor-pointer";

function NotificationBanner({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  return (
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
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function DocChips({
  names,
  tone,
  empty,
  conditionNames,
}: {
  names: string[];
  tone: "output" | "requirement";
  empty: string;
  /** Nama kondisi di katalog (huruf kecil), untuk ditandai berbeda dari dokumen. */
  conditionNames?: Set<string>;
}) {
  if (names.length === 0) return <span className="text-sm text-muted">{empty}</span>;

  const className =
    tone === "output"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name, idx) => {
        const isCondition = conditionNames?.has(name.toLowerCase()) ?? false;
        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
              isCondition ? CONDITION_CHIP : className
            }`}
          >
            {isCondition && <ConditionTag />}
            {name}
          </span>
        );
      })}
    </div>
  );
}

export default function LayananManager({
  initialServices,
  documents,
}: {
  initialServices: AdminServiceItem[];
  documents: ServiceDocumentItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<Notification | null>(null);

  // Dokumen yang baru dibuat dari pemilih langsung dipakai, tanpa menunggu
  // halaman dimuat ulang. Setelah revalidasi, `documents` sudah memuatnya juga.
  const [createdDocuments, setCreatedDocuments] = useState<ServiceDocumentItem[]>([]);
  const catalog = useMemo(() => {
    const known = new Set(documents.map((doc) => doc.id));
    return [...documents, ...createdDocuments.filter((doc) => !known.has(doc.id))];
  }, [documents, createdDocuments]);
  const conditionNames = useMemo(
    () =>
      new Set(
        catalog.filter((doc) => doc.type === "kondisi").map((doc) => doc.name.toLowerCase()),
      ),
    [catalog],
  );

  // `null` = tertutup, "new" = tambah, selain itu layanan yang diubah.
  const [formTarget, setFormTarget] = useState<AdminServiceItem | "new" | null>(null);
  const [viewing, setViewing] = useState<AdminServiceItem | null>(null);
  const [deleting, setDeleting] = useState<AdminServiceItem | null>(null);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialServices;
    return initialServices.filter((s) =>
      [s.name, s.info_procedure ?? "", ...s.requirements, ...s.output_documents].some((text) =>
        text.toLowerCase().includes(q),
      ),
    );
  }, [initialServices, searchQuery]);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sukses hilang sendiri; error (mis. alasan layanan tidak bisa dihapus)
  // bertahan sampai ditutup, karena isinya perlu dibaca.
  const showNotification = (type: Notification["type"], message: string) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setNotification({ type, message });
    if (type === "success") {
      dismissTimer.current = setTimeout(() => setNotification(null), 6000);
    }
  };

  const openForm = (target: AdminServiceItem | "new") => {
    // Pesan lama dari halaman jangan ikut muncul di dalam modal yang baru dibuka.
    setNotification(null);
    setFormTarget(target);
  };

  const handleCreateDocument = async (name: string, type: ServiceDocumentType) => {
    const res = await createServiceDocumentAction(name, "", type);
    if (!res.ok || !res.document) {
      showNotification("error", res.error ?? "Gagal menambahkan dokumen.");
      return null;
    }
    setCreatedDocuments((prev) => [...prev, res.document!]);
    showNotification("success", res.message ?? "Dokumen ditambahkan ke katalog.");
    return res.document;
  };

  const handleSubmit = (input: ServiceInput) => {
    const target = formTarget;
    if (!target) return;

    startTransition(async () => {
      const res =
        target === "new"
          ? await createServiceAction(input)
          : await updateServiceAction(target.id, input);

      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal menyimpan layanan.");
      } else {
        showNotification("success", res.message ?? "Layanan tersimpan.");
        setFormTarget(null);
      }
    });
  };

  const handleDelete = () => {
    if (!deleting) return;

    startTransition(async () => {
      const res = await deleteServiceAction(deleting.id);
      if (!res.ok) {
        showNotification("error", res.error ?? "Gagal menghapus layanan.");
      } else {
        showNotification("success", res.message ?? "Layanan berhasil dihapus.");
      }
      setDeleting(null);
    });
  };

  const columns: DataTableColumn<AdminServiceItem>[] = [
    {
      header: "Nama Layanan",
      width: "22%",
      cell: (layanan) => <span className="font-semibold text-ink">{layanan.name}</span>,
    },
    {
      header: "Dokumen Output",
      width: "26%",
      cell: (layanan) => (
        <DocChips names={layanan.output_documents} tone="output" empty="-" />
      ),
    },
    {
      header: "Prasyarat Dokumen",
      width: "26%",
      cell: (layanan) => (
        <DocChips
          names={layanan.requirements}
          tone="requirement"
          empty="Tanpa syarat"
          conditionNames={conditionNames}
        />
      ),
    },
    {
      header: "Estimasi",
      width: "12%",
      cell: (layanan) => <span className="text-sm text-ink">{layanan.estimate}</span>,
    },
    {
      header: "Aksi",
      width: "14%",
      cell: (layanan) => (
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => setViewing(layanan)}
            aria-label={`Lihat ${layanan.name}`}
            title="Lihat Detail"
          >
            <Eye size={20} />
          </IconButton>
          <IconButton
            onClick={() => openForm(layanan)}
            aria-label={`Ubah ${layanan.name}`}
            title="Ubah Layanan"
          >
            <Pencil size={20} />
          </IconButton>
          <IconButton
            onClick={() => setDeleting(layanan)}
            aria-label={`Hapus ${layanan.name}`}
            title="Hapus Layanan"
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
      {notification && !formTarget && (
        <NotificationBanner notification={notification} onClose={() => setNotification(null)} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-[30px]">
        <SearchBar
          id="cari-layanan"
          label="Cari layanan"
          size="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama layanan atau dokumen..."
          containerClassName="flex-1"
        />
        <Button
          variant="solid"
          onClick={() => openForm("new")}
          className="w-full sm:w-[205px] cursor-pointer"
        >
          <Plus size={24} className="shrink-0" />
          Tambah Layanan
        </Button>
      </div>

      {filteredServices.length === 0 ? (
        <div className="rounded-[20px] bg-white px-6 py-10 text-center font-display text-sm text-muted shadow-soft">
          {initialServices.length === 0
            ? "Belum ada layanan. Tambahkan layanan pertama instansi Anda."
            : `Tidak ada layanan yang cocok dengan "${searchQuery.trim()}".`}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredServices}
          rowKey={(layanan) => String(layanan.id)}
        />
      )}

      {formTarget && (
        <ServiceFormModal
          // Remount per target supaya isian form selalu mulai dari data layanan itu.
          key={formTarget === "new" ? "new" : formTarget.id}
          service={formTarget === "new" ? null : formTarget}
          catalog={catalog}
          isPending={isPending}
          // Banner halaman tertutup overlay, jadi pesan saat form terbuka
          // (nama bentrok, dokumen gagal dibuat) ditampilkan di dalam modal.
          notice={
            notification && (
              <NotificationBanner
                notification={notification}
                onClose={() => setNotification(null)}
              />
            )
          }
          onClose={() => {
            setFormTarget(null);
            setNotification(null);
          }}
          onSubmit={handleSubmit}
          onCreateDocument={handleCreateDocument}
        />
      )}

      {viewing && (
        <ServiceDetailModal
          service={viewing}
          conditionNames={conditionNames}
          onClose={() => setViewing(null)}
          onEdit={() => {
            openForm(viewing);
            setViewing(null);
          }}
        />
      )}

      {deleting && (
        <div className={OVERLAY}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hapus-layanan-judul"
            className="relative flex w-full max-w-[420px] flex-col gap-4 rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 size={24} />
            </div>

            <div>
              <h2 id="hapus-layanan-judul" className="font-display text-lg font-bold text-ink">
                Hapus &quot;{deleting.name}&quot;?
              </h2>
              <p className="font-display text-xs text-queue-idle mt-1 leading-relaxed">
                Layanan yang sudah memiliki riwayat antrean atau ulasan tidak dapat
                dihapus, demi menjaga keutuhan riwayat dan laporan. Layanan yang belum
                pernah dipakai akan dihapus permanen.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button type="button" onClick={() => setDeleting(null)} className={SECONDARY_BUTTON}>
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-red-600 py-2.5 font-display text-sm font-semibold text-white shadow-soft hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceFormModal({
  service,
  catalog,
  isPending,
  notice,
  onClose,
  onSubmit,
  onCreateDocument,
}: {
  service: AdminServiceItem | null;
  catalog: ServiceDocumentItem[];
  isPending: boolean;
  notice: React.ReactNode;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => void;
  onCreateDocument: (
    name: string,
    type: ServiceDocumentType,
  ) => Promise<ServiceDocumentItem | null>;
}) {
  const nameId = useId();
  const estimateId = useId();
  const infoId = useId();

  const [name, setName] = useState(service?.name ?? "");
  const [estimate, setEstimate] = useState(
    service?.estimated_time ? String(service.estimated_time) : "",
  );
  const [info, setInfo] = useState(service?.info_procedure ?? "");
  const [requirementIds, setRequirementIds] = useState(service?.requirement_doc_ids ?? []);
  const [outputIds, setOutputIds] = useState(service?.output_doc_ids ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      estimatedTime: estimate.trim() ? Number(estimate) : null,
      infoProcedure: info,
      requirementDocIds: requirementIds,
      outputDocIds: outputIds,
    });
  };

  return (
    <div className={OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-layanan-judul"
        className="relative flex max-h-[92vh] w-full max-w-[640px] flex-col gap-5 overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95"
      >
        <button type="button" onClick={onClose} aria-label="Tutup" className={CLOSE_BUTTON}>
          <X size={20} />
        </button>

        <div>
          <h2 id="form-layanan-judul" className="font-display text-xl font-bold text-ink">
            {service ? "Ubah Layanan" : "Tambah Layanan Baru"}
          </h2>
          <p className="font-display text-xs text-queue-idle mt-0.5">
            Dokumen dipilih dari katalog dokumen. Nama dokumen yang tampil di aplikasi
            warga mengikuti katalog ini.
          </p>
        </div>

        {notice}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className={FIELD_LABEL}>
                Nama Layanan
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pembuatan Akta Kelahiran"
                maxLength={150}
                required
                autoFocus
                className={FIELD_INPUT}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={estimateId} className={FIELD_LABEL}>
                Estimasi (menit)
              </label>
              <input
                id={estimateId}
                type="number"
                inputMode="numeric"
                min={1}
                max={480}
                step={1}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="15"
                className={FIELD_INPUT}
              />
            </div>
          </div>

          <ServiceDocumentPicker
            label="Prasyarat Dokumen"
            hint="Dokumen yang harus dibawa warga, atau kondisi yang harus dipenuhi (mis. berusia 17 tahun)."
            tone="requirement"
            catalog={catalog}
            selectedIds={requirementIds}
            onChange={setRequirementIds}
            onCreate={onCreateDocument}
          />

          <ServiceDocumentPicker
            label="Dokumen Output"
            hint="Dokumen yang diterima warga setelah layanan selesai."
            tone="output"
            catalog={catalog}
            selectedIds={outputIds}
            onChange={setOutputIds}
            onCreate={onCreateDocument}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={infoId} className={FIELD_LABEL}>
              Info Prosedur <span className="font-normal normal-case text-queue-idle">(opsional)</span>
            </label>
            <textarea
              id={infoId}
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Langkah-langkah atau catatan untuk warga."
              className={`${FIELD_INPUT} resize-y`}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
              Batal
            </button>
            <button type="submit" disabled={isPending || !name.trim()} className={PRIMARY_BUTTON}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{service ? "Simpan Perubahan" : "Simpan Layanan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServiceDetailModal({
  service,
  conditionNames,
  onClose,
  onEdit,
}: {
  service: AdminServiceItem;
  conditionNames: Set<string>;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-layanan-judul"
        className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col gap-5 overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl animate-in zoom-in-95"
      >
        <button type="button" onClick={onClose} aria-label="Tutup" className={CLOSE_BUTTON}>
          <X size={20} />
        </button>

        <div className="pr-8">
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-queue-idle">
            Detail Layanan
          </span>
          <h2 id="detail-layanan-judul" className="font-display text-xl font-bold text-ink">
            {service.name}
          </h2>
        </div>

        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <dt className={FIELD_LABEL}>Estimasi Waktu</dt>
            <dd className="font-display text-sm text-ink">{service.estimate}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className={FIELD_LABEL}>Prasyarat Dokumen</dt>
            <dd>
              <DocChips
                names={service.requirements}
                tone="requirement"
                empty="Tanpa syarat"
                conditionNames={conditionNames}
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className={FIELD_LABEL}>Dokumen Output</dt>
            <dd>
              <DocChips names={service.output_documents} tone="output" empty="-" />
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className={FIELD_LABEL}>Info Prosedur</dt>
            <dd className="whitespace-pre-line font-display text-sm text-ink">
              {service.info_procedure || <span className="text-muted">Belum diisi.</span>}
            </dd>
          </div>
        </dl>

        <div className="flex gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Tutup
          </button>
          <button type="button" onClick={onEdit} className={PRIMARY_BUTTON}>
            <Pencil size={16} />
            <span>Ubah Layanan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
