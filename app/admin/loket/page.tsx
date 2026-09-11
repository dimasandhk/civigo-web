import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Button from "../../components/Button";
import DataTable, { type DataTableColumn } from "../../components/DataTable";
import IconButton from "../../components/IconButton";
import PageHeader from "../../components/admin/PageHeader";
import SearchBar from "../../components/SearchBar";
import StatusBadge, { type Status } from "../../components/StatusBadge";

export const metadata: Metadata = {
  title: "Loket — CiviGo",
};

type Loket = {
  name: string;
  status: Status;
  days: string;
  hours: string;
  createdDate: string;
  createdTime: string;
};

const LOKET: Loket[] = [
  {
    name: "Loket 5",
    status: "aktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 6",
    status: "aktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 7",
    status: "aktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 8",
    status: "aktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 9",
    status: "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 10",
    status: "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 11",
    status: "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 12",
    status: "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
  {
    name: "Loket 13",
    status: "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "12 Mei 2026",
    createdTime: "10:30",
  },
];

const SUBTEXT = "text-[16px] tracking-[0.02em] text-ink-soft";

const COLUMNS: DataTableColumn<Loket>[] = [
  { header: "Nama Loket", width: "18.5%", cell: (loket) => loket.name },
  {
    header: "Status",
    width: "22.53%",
    cell: (loket) => <StatusBadge status={loket.status} />,
  },
  {
    header: "Jadwal Buka",
    width: "24.22%",
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
    width: "22.42%",
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
    width: "12.33%",
    cell: (loket) => (
      <div className="flex items-center gap-3">
        <IconButton aria-label={`Ubah ${loket.name}`}>
          <Pencil size={24} />
        </IconButton>
        <IconButton aria-label={`Hapus ${loket.name}`}>
          <Trash2 size={24} />
        </IconButton>
      </div>
    ),
  },
];

export default function LoketPage() {
  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader
        title="Loket"
        description="Kelola loket yang melayani antrean"
      />

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-[30px]">
          <SearchBar
            id="cari-loket"
            label="Cari loket"
            size="sm"
            placeholder="Cari loket"
            containerClassName="flex-1"
          />
          <Button variant="solid" className="w-full sm:w-[205px]">
            <Plus size={24} className="shrink-0" />
            Tambah Loket
          </Button>
        </div>

        <DataTable
          columns={COLUMNS}
          rows={LOKET}
          rowKey={(loket) => loket.name}
        />
      </div>
    </div>
  );
}
