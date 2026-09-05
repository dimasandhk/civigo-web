import type { Metadata } from "next";
import Button from "../../components/Button";
import AdjacentQueueCard from "../../components/admin/AdjacentQueueCard";
import DetailField from "../../components/admin/DetailField";
import LoketTab from "../../components/admin/LoketTab";
import PageHeader from "../../components/admin/PageHeader";

export const metadata: Metadata = {
  title: "Antrean — CiviGo",
};

const LOKET_TABS = ["Loket 5", "Loket 6", "Loket 7", "Loket 8"];

const CURRENT = {
  number: "B45",
  since: "Sejak 10:10 WIB",
  fields: [
    { label: "Nama Lengkap", value: "Arga Saputra", valueClassName: "" },
    {
      label: "No HP",
      value: "+628888555100",
      valueClassName: "leading-6 tracking-[0.05em]",
    },
    {
      label: "NIK",
      value: "3578••••••••••21",
      valueClassName: "tracking-[0.1em]",
    },
    {
      label: "Layanan",
      value: "Pembuatan KTP-el",
      valueClassName: "leading-6 tracking-[0.02em]",
    },
  ],
};

const REMAINING = 44;

export default function AntreanPage() {
  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Antrean"
        description="Kelola antrean di loket pelayanan"
      />

      <div className="flex gap-5">
        {LOKET_TABS.map((label, index) => (
          <LoketTab key={label} label={label} isActive={index === 0} />
        ))}
      </div>

      <section className="flex flex-col gap-[30px] rounded-[20px] bg-white px-10 py-[30px] shadow-soft">
        <div>
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Nomor Antrean Saat Ini
          </h2>
          <div className="flex h-[182px] flex-col items-center justify-between">
            <span className="font-display text-[120px] leading-none font-semibold text-brand">
              {CURRENT.number}
            </span>
            <span className="font-display text-[20px] font-medium text-queue-idle">
              {CURRENT.since}
            </span>
          </div>
        </div>

        <div className="flex justify-between">
          {CURRENT.fields.map((field) => (
            <DetailField key={field.label} {...field} />
          ))}
        </div>

        <div className="flex gap-[30px]">
          <Button variant="success" className="flex-1">
            Selesaikan Layanan
          </Button>
          <Button variant="danger" className="flex-1">
            Hanguskan Antrean
          </Button>
        </div>
      </section>

      <div className="flex justify-between">
        <AdjacentQueueCard
          muted
          label="Sebelumnya"
          number="A44"
          name="Dewi Maharani"
          service="Aktivasi IKD"
        />

        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white px-10 py-5 shadow-soft">
          <span className="text-center font-display text-[20px] font-medium text-ink">
            Sisa Antrean
          </span>
          <span className="text-center font-display text-[48px] font-semibold text-ink">
            <span className="text-brand">{REMAINING}</span>{" "}
            <span className="text-[18px]">orang</span>
          </span>
        </div>

        <AdjacentQueueCard
          label="Berikutnya"
          number="A46"
          name="Andi Pratama"
          service="Konsultasi Administrasi"
        />
      </div>
    </div>
  );
}
