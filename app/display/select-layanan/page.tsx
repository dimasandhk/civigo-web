import {
  Banknote,
  CarFront,
  House,
  IdCard,
  Mail,
  TicketsPlane,
} from "lucide-react";
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
    <main className="relative flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden bg-board px-6 py-4 sm:px-10 sm:py-5 lg:px-14">
      {/* Tombol Kembali ke Kiosk Menu */}
      <BackButton
        href="/display"
        className="absolute top-4 left-4 sm:top-5 sm:left-8"
      />

      <div className="flex w-full max-w-[1100px] flex-col items-center justify-center gap-3 sm:gap-4 lg:gap-4.5">
        <h1 className="text-center font-display text-xl sm:text-2xl lg:text-[28px] font-semibold leading-tight text-ink">
          Pilih Layanan atau Instansi
        </h1>

        <SearchBar
          id="cari-layanan"
          label="Cari layanan atau instansi"
          size="sm"
          placeholder="Cari layanan atau instansi pemerintahan"
          containerClassName="w-full max-w-[850px]"
        />

        {/* Tab Layanan / Instansi */}
        <div className="flex w-full max-w-[850px] gap-2 rounded-[10px] bg-white p-1 shadow-xs">
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[8px] bg-brand py-2 font-display text-base sm:text-lg font-medium text-white shadow-xs"
          >
            Layanan
          </button>
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[8px] py-2 font-display text-base sm:text-lg font-medium text-muted transition-colors hover:text-ink"
          >
            Instansi
          </button>
        </div>

        {/* Layanan Populer */}
        <section className="flex w-full max-w-[1100px] flex-col gap-2">
          <h2 className="font-display text-base sm:text-lg lg:text-[20px] font-semibold text-ink">
            Layanan Populer
          </h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
            {POPULAR_SERVICES.map((service) => (
              <PopularServiceCard key={service.label} {...service} />
            ))}
          </div>
        </section>

        {/* Kategori Layanan */}
        <section className="flex w-full max-w-[1100px] flex-col gap-2">
          <h2 className="font-display text-base sm:text-lg lg:text-[20px] font-semibold text-ink">
            Kategori Layanan
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-2.5">
            {CATEGORIES.map((label) => (
              <ServiceCategoryButton key={label} label={label} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
