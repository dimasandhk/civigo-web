import type { Metadata } from "next";
import BackButton from "../../components/display/BackButton";
import KioskServiceSelection, {
  type KioskService,
} from "../../components/display/KioskServiceSelection";
import { getAllServices } from "@/lib/queue/cross-agency";

export const metadata: Metadata = {
  title: "Pilih Layanan atau Instansi — CiviGo",
};

export default async function SelectLayananPage() {
  const allServices = await getAllServices();

  const kioskServices: KioskService[] = allServices.map((s) => ({
    id: s.id,
    name: s.name,
    estimated_time: s.estimated_time,
    agency_id: s.agency_id,
    agency: {
      id: s.agency.id,
      name: s.agency.name,
      open_time: s.agency.open_time ?? "08:00",
      close_time: s.agency.close_time ?? "16:00",
      operating_days: s.agency.operating_days ?? [1, 2, 3, 4, 5],
    },
    requirements: s.requirements,
    output_documents: s.output_documents,
  }));

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start overflow-y-auto bg-board px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
      {/* Tombol Kembali ke Kiosk Menu */}
      <BackButton
        href="/display"
        className="absolute top-4 left-4 sm:top-6 sm:left-8 z-10"
      />

      <div className="flex w-full max-w-[1100px] flex-col items-center gap-6 pt-10 sm:pt-4">
        <header className="flex flex-col items-center gap-1 sm:gap-2 text-center">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-[34px] font-semibold leading-tight text-ink">
            Pilih Layanan Antrean
          </h1>
          <p className="font-display text-sm sm:text-base font-medium text-brand">
            Pilih layanan instansi untuk mengambil nomor antrean walk-in
          </p>
        </header>

        <KioskServiceSelection services={kioskServices} />
      </div>
    </main>
  );
}

