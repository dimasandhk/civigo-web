import type { Metadata } from "next";
import Image from "next/image";
import BackButton from "../../components/display/BackButton";
import PopularServiceCard from "../../components/display/PopularServiceCard";
import ServiceCategoryButton from "../../components/display/ServiceCategoryButton";

export const metadata: Metadata = {
  title: "Pilih Layanan atau Instansi — CiviGo",
};

const POPULAR_SERVICES = [
  { icon: "/icons/layanan/ktp.svg", label: "Layanan KTP" },
  { icon: "/icons/layanan/kk.svg", label: "Layanan KK" },
  { icon: "/icons/layanan/sim.svg", label: "Layanan SIM" },
  { icon: "/icons/layanan/pajak-kendaraan.svg", label: "Pajak Kendaraan" },
  { icon: "/icons/layanan/skck.svg", label: "Layanan SKCK" },
  { icon: "/icons/layanan/paspor.svg", label: "Layanan Paspor" },
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

        <div className="flex w-full items-center gap-5 rounded-[20px] bg-field px-[25px] py-2.5">
          <Image
            src="/icons/search.svg"
            alt=""
            width={30}
            height={30}
            className="shrink-0"
          />
          <label htmlFor="search" className="sr-only">
            Cari layanan atau instansi
          </label>
          <input
            id="search"
            name="search"
            type="search"
            placeholder="Cari layanan atau instansi pemerintahan"
            className="w-full bg-transparent font-display text-[22px] leading-6 text-ink outline-none placeholder:text-placeholder"
          />
        </div>

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
            {POPULAR_SERVICES.map(({ icon, label }) => (
              <PopularServiceCard key={label} icon={icon} label={label} />
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
