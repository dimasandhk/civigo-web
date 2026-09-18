import type { Metadata } from "next";
import BackButton from "../../components/display/BackButton";
import KioskServiceSelection, {
  type KioskService,
} from "../../components/display/KioskServiceSelection";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Pilih Layanan atau Instansi — CiviGo",
};

export default async function SelectLayananPage() {
  const supabase = createServiceClient();
  const { data: services } = await supabase
    .from("services")
    .select(`
      id,
      name,
      estimated_time,
      agency_id,
      agency:agencies(id, name, open_time, close_time, operating_days)
    `)
    .order("id", { ascending: true });

  const kioskServices: KioskService[] = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    estimated_time: s.estimated_time,
    agency_id: s.agency_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agency: s.agency as any,
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

