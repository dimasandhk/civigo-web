import { IdCard, House, CarFront, Banknote, Mail, TicketsPlane } from "lucide-react";
import type { Metadata } from "next";
import SearchBar from "../../components/SearchBar";
import BackButton from "../../components/display/BackButton";
import PopularServiceCard from "../../components/display/PopularServiceCard";
import ServiceCategoryButton from "../../components/display/ServiceCategoryButton";

export const metadata: Metadata = {
  title: "Pilih Layanan atau Instansi — CiviGo",
};

const POPULAR_SERVICES = [
  {
    icon: IdCard,
    label: "Layanan KTP",
    iconBackground: "#EBE2FF",
    iconColor: "#3800B1",
  },
  {
    icon: House,
    label: "Layanan KK",
    iconBackground: "#E4FFE2",
    iconColor: "#0F7100",
  },
  {
    icon: CarFront,
    label: "Layanan SIM",
    iconBackground: "#CFEEFF",
    iconColor: "#0081D8",
  },
  {
    icon: Banknote,
    label: "Pajak Kendaraan",
    iconBackground: "#FFEED0",
    iconColor: "#D48600",
  },
  {
    icon: Mail,
    label: "Layanan SKCK",
    iconBackground: "#FFFCCB",
    iconColor: "#E0BE00",
  },
  {
    icon: TicketsPlane,
    label: "Layanan Paspor",
    iconBackground: "#FFE1E1",
    iconColor: "#C30003",
  },
];

const CATEGORIES = [
  "Kependudukan",
  "Kendaraan",
  "Pajak & Retribusi",
  "Perizinan",
  "Kesehatan",
  "Hukum & Peradilan",
];

export default function SelectLayananPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-board px-14 py-[62px]">
      <BackButton href="/display" className="absolute top-[30px] left-[50px]" />

      <div className="flex w-full max-w-[1167px] flex-col items-center gap-[50px]">
        <h1 className="text-center font-display text-[40px] font-semibold leading-[50px] text-ink">
          Pilih Layanan atau Instansi
        </h1>

        <SearchBar
          id="cari-layanan"
          label="Cari layanan atau instansi"
          placeholder="Cari layanan atau instansi pemerintahan"
          containerClassName="w-full"
        />

        <div className="flex w-full gap-2 rounded-[12px] bg-white p-1">
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-lg bg-brand px-3 py-[15px] font-display text-[28px] font-medium leading-6 text-white shadow-sm"
          >
            Layanan
          </button>
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[12px] px-3 py-[15px] font-display text-[28px] font-medium leading-6 text-muted shadow-sm"
          >
            Instansi
          </button>
        </div>

        <section className="flex w-full flex-col gap-5">
          <h2 className="font-display text-[32px] font-semibold leading-10 text-ink">
            Layanan Populer
          </h2>
          <div className="flex justify-between gap-4">
            {POPULAR_SERVICES.map((service) => (
              <PopularServiceCard key={service.label} {...service} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-5">
          <h2 className="font-display text-[32px] font-semibold leading-10 text-ink">
            Kategori Layanan
          </h2>
          <div className="flex justify-between gap-4">
            {CATEGORIES.map((label) => (
              <ServiceCategoryButton key={label} label={label} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
