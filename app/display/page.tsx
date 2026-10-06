import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import ExitToAdminButton from "../components/display/ExitToAdminButton";
import {
  getKioskLocations,
  resolveKioskLocation,
  withKioskLocation,
} from "@/lib/data/kiosk";

export const metadata: Metadata = {
  title: "Ambil Antrean Layanan — CiviGo",
};

const OPTIONS = [
  {
    href: "/display/input-code",
    icon: "/images/kiosk-registered.png",
    title: "SUDAH MENDAFTAR",
    description: "Pindai Kode antrean Anda",
  },
  {
    href: "/display/select-layanan",
    icon: "/images/kiosk-unregistered.png",
    title: "BELUM MENDAFTAR",
    description: "Pilih Layanan yang dibutuhkan",
  },
];

export default async function KioskPage({ searchParams }: PageProps<"/display">) {
  const { locationId } = await searchParams;
  const location = await resolveKioskLocation(locationId);
  // Kios tidak login, jadi cabangnya dipilih sekali di perangkat ini lalu ikut di URL.
  // Tanpa itu tiket walk-in dulu selalu tercatat di lokasi 1 (MPP).
  const locations = location ? [] : await getKioskLocations();

  return (
    <main className="relative flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden bg-board px-6 py-4 sm:px-10 sm:py-6 lg:px-14">
      {/* Tombol Kembali ke Dashboard Admin dengan Konfirmasi */}
      <ExitToAdminButton />
      <div className="flex w-full max-w-[1100px] flex-col items-center justify-between gap-6 sm:gap-8 lg:gap-10">
        {/* Header Kiosk */}
        <header className="flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/images/civigo-mark.svg"
              alt=""
              width={80}
              height={80}
              priority
              className="size-14 sm:size-16 lg:size-20 rounded-full"
            />
            <span className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-none text-brand">
              CiviGo
            </span>
          </div>
          <p className="font-display text-base sm:text-xl lg:text-[22px] font-semibold tracking-[0.04em] text-muted">
            Ambil Antrean Layanan
          </p>
        </header>

        {location ? (
          <>
            {/* Call to Action Title */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-center font-display text-xl sm:text-2xl lg:text-[32px] font-semibold leading-snug text-ink">
                Silakan pilih cara melanjutkan antrean
              </h1>
              <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-display text-sm text-muted">
                <MapPin size={16} className="text-brand" />
                <span>Lokasi kios: {location.name}</span>
                <Link href="/display" className="font-semibold text-brand underline-offset-2 hover:underline">
                  Ganti lokasi
                </Link>
              </p>
            </div>

            {/* 2 Pilihan Kartu Kiosk */}
            <div className="flex w-full flex-wrap justify-center gap-6 sm:gap-8 lg:gap-12">
              {OPTIONS.map(({ href, icon, title, description }) => (
                <Link
                  key={title}
                  href={withKioskLocation(href, location.id)}
                  className="flex w-full max-w-[340px] cursor-pointer flex-col items-center gap-3 sm:gap-4 rounded-[24px] bg-white p-6 sm:p-7 lg:max-w-[400px] lg:rounded-[30px] shadow-soft transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-counter-top active:translate-y-0"
                >
                  <Image
                    src={icon}
                    alt=""
                    width={140}
                    height={140}
                    className="size-24 sm:size-28 lg:size-32 object-contain"
                  />
                  <span className="flex flex-col items-center gap-1.5 text-center">
                    <span className="font-display text-xl sm:text-2xl lg:text-[26px] font-bold text-ink">
                      {title}
                    </span>
                    <span className="w-auto max-w-[280px] font-display text-sm sm:text-base lg:text-[18px] font-medium text-muted">
                      {description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <section className="flex w-full max-w-[720px] flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="font-display text-xl sm:text-2xl lg:text-[32px] font-semibold leading-snug text-ink">
                Kios ini berada di lokasi mana?
              </h1>
              <p className="font-display text-sm sm:text-base text-muted">
                Pilih sekali saat memasang kios. Nomor antrean walk-in akan tercatat di lokasi ini.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {locations.map((loc) => (
                <Link
                  key={loc.id}
                  href={withKioskLocation("/display", loc.id)}
                  className="flex items-center gap-3 rounded-[18px] bg-white p-4 font-display text-[16px] font-semibold text-ink shadow-soft transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-counter-top"
                >
                  <MapPin size={20} className="shrink-0 text-brand" />
                  <span>{loc.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
