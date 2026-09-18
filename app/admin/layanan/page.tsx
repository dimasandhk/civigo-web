import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Button from "../../components/Button";
import DataTable, { type DataTableColumn } from "../../components/DataTable";
import IconButton from "../../components/IconButton";
import PageHeader from "../../components/admin/PageHeader";
import SearchBar from "../../components/SearchBar";
import StatusBadge from "../../components/StatusBadge";

import {
  getAdminServices,
  resolveAgencyId,
  type AdminServiceItem,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Layanan — CiviGo",
};

type Layanan = AdminServiceItem;

const COLUMNS: DataTableColumn<Layanan>[] = [
  {
    header: "Nama Layanan",
    width: "20%",
    cell: (layanan) => (
      <span className="font-semibold text-ink">{layanan.name}</span>
    ),
  },
  {
    header: "Dokumen Output",
    width: "24%",
    cell: (layanan) => (
      <div className="flex flex-wrap gap-1">
        {layanan.output_documents && layanan.output_documents.length > 0 ? (
          layanan.output_documents.map((doc, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
            >
              {doc}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">-</span>
        )}
      </div>
    ),
  },
  {
    header: "Prasyarat Dokumen",
    width: "24%",
    cell: (layanan) => (
      <div className="flex flex-wrap gap-1">
        {layanan.requirements && layanan.requirements.length > 0 ? (
          layanan.requirements.map((req, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
            >
              {req}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">Tanpa syarat</span>
        )}
      </div>
    ),
  },
  {
    header: "Estimasi",
    width: "12%",
    cell: (layanan) => <span className="text-sm text-ink">{layanan.estimate}</span>,
  },
  {
    header: "Status",
    width: "10%",
    cell: (layanan) => <StatusBadge status={layanan.status} />,
  },
  {
    header: "Aksi",
    width: "10%",
    cell: (layanan) => (
      <div className="flex items-center gap-2">
        <IconButton aria-label={`Lihat ${layanan.name}`}>
          <Eye size={20} />
        </IconButton>
        <IconButton aria-label={`Ubah ${layanan.name}`}>
          <Pencil size={20} />
        </IconButton>
        <IconButton aria-label={`Hapus ${layanan.name}`}>
          <Trash2 size={20} />
        </IconButton>
      </div>
    ),
  },
];

export default async function LayananPage() {
  const services = await getAdminServices(await resolveAgencyId());

  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader
        title="Layanan"
        description="Kelola daftar layanan yang tersedia di instansi Anda"
      />

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-[30px]">
          <SearchBar
            id="cari-layanan"
            label="Cari layanan"
            size="sm"
            placeholder="Cari layanan"
            containerClassName="flex-1"
          />
          <Button variant="solid" className="w-full sm:w-[205px]">
            <Plus size={24} className="shrink-0" />
            Tambah Layanan
          </Button>
        </div>

        <DataTable
          columns={COLUMNS}
          rows={services}
          rowKey={(layanan) => layanan.name}
        />
      </div>
    </div>
  );
}
