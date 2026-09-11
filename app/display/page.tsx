import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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

export default function KioskPage() {
  return (
    <main className="flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden bg-board px-6 py-4 sm:px-10 sm:py-6 lg:px-14">
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

        {/* Call to Action Title */}
        <h1 className="text-center font-display text-xl sm:text-2xl lg:text-[32px] font-semibold leading-snug text-ink">
          Silakan pilih cara melanjutkan antrean
        </h1>

        {/* 2 Pilihan Kartu Kiosk */}
        <div className="flex w-full flex-wrap justify-center gap-6 sm:gap-8 lg:gap-12">
          {OPTIONS.map(({ href, icon, title, description }) => (
            <Link
              key={title}
              href={href}
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
      </div>
    </main>
  );
}
