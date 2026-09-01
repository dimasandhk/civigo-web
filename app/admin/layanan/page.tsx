import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Button from "../../components/Button";
import DataTable, { type DataTableColumn } from "../../components/DataTable";
import IconButton from "../../components/IconButton";
import SearchBar from "../../components/SearchBar";
import StatusBadge, { type Status } from "../../components/StatusBadge";

export const metadata: Metadata = {
  title: "Layanan — CiviGo",
};

type Layanan = {
  name: string;
  category: string;
  status: Status;
  estimate: string;
};

const LAYANAN: Layanan[] = [
  {
    name: "Pembuatan KTP-el",
    category: "Kependudukan",
    status: "aktif",
    estimate: "15 menit",
  },
  {
    name: "Aktivasi Identitas Kependudukan Digital",
    category: "Kependudukan",
    status: "aktif",
    estimate: "15 menit",
  },
  {
    name: "Konsultasi Administrasi Kependudukan",
    category: "Kependudukan",
    status: "aktif",
    estimate: "20 menit",
  },
  {
    name: "Layanan Administrasi Kependudukan",
    category: "Kependudukan",
    status: "aktif",
    estimate: "20 menit",
  },
];

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

export default function LayananPage() {
  return (
    <div className="flex flex-col gap-[34px]">
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-6 text-ink">Layanan</h1>
        <p className="text-[16px] font-semibold leading-6 text-muted">
          Kelola daftar layanan yang tersedia di instansi Anda
        </p>
      </header>

      <div className="flex flex-col gap-7">
        <div className="flex gap-[30px]">
          <SearchBar
            id="cari-layanan"
            label="Cari layanan"
            size="sm"
            placeholder="Cari layanan"
            containerClassName="flex-1"
          />
          <Button variant="solid" className="w-[205px]">
            <Plus size={24} className="shrink-0" />
            Tambah Layanan
          </Button>
        </div>

        <DataTable
          columns={COLUMNS}
          rows={LAYANAN}
          rowKey={(layanan) => layanan.name}
        />
      </div>
    </div>
  );
}
