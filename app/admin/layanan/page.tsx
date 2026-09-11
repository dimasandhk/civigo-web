import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Button from "../../components/Button";
import DataTable, { type DataTableColumn } from "../../components/DataTable";
import IconButton from "../../components/IconButton";
import PageHeader from "../../components/admin/PageHeader";
import SearchBar from "../../components/SearchBar";
import StatusBadge, { type Status } from "../../components/StatusBadge";

import { getAdminServices } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Layanan — CiviGo",
};

type Layanan = {
  id: number;
  name: string;
  category: string;
  status: Status;
  estimate: string;
};

const COLUMNS: DataTableColumn<Layanan>[] = [
  { header: "Nama Layanan", width: "29.76%", cell: (layanan) => layanan.name },
  { header: "Kategori", width: "19.29%", cell: (layanan) => layanan.category },
  {
    header: "Status",
    width: "16.49%",
    cell: (layanan) => <StatusBadge status={layanan.status} />,
  },
  { header: "Estimasi", width: "16.96%", cell: (layanan) => layanan.estimate },
  {
    header: "Aksi",
    width: "17.5%",
    cell: (layanan) => (
      <div className="flex items-center gap-3">
        <IconButton aria-label={`Lihat ${layanan.name}`}>
          <Eye size={24} />
        </IconButton>
        <IconButton aria-label={`Ubah ${layanan.name}`}>
          <Pencil size={24} />
        </IconButton>
        <IconButton aria-label={`Hapus ${layanan.name}`}>
          <Trash2 size={24} />
        </IconButton>
      </div>
    ),
  },
];

export default async function LayananPage() {
  const services = await getAdminServices(1);

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
