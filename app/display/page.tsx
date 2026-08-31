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
    <main className="flex min-h-screen items-center justify-center bg-board px-14 py-[113px]">
      <div className="flex w-full max-w-[1167px] flex-col items-center gap-[55px]">
        <header className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-[15px]">
            <Image
              src="/images/civigo-mark.svg"
              alt=""
              width={91}
              height={91}
              priority
              className="size-[91px] rounded-full"
            />
            <span className="text-[72px] font-extrabold leading-[91px] text-brand">
              CiviGo
            </span>
          </div>
          <p className="font-display text-[28px] font-semibold leading-[35px] tracking-[0.06em] text-muted">
            Ambil Antrean Layanan
          </p>
        </header>

        <h1 className="text-center font-display text-[40px] font-semibold leading-[50px] text-ink">
          Silakan pilih cara melanjutkan antrean
        </h1>

        <div className="flex flex-wrap justify-center gap-[55px]">
          {OPTIONS.map(({ href, icon, title, description }) => (
            <Link
              key={title}
              href={href}
              className="flex cursor-pointer flex-col items-center gap-5 rounded-[30px] bg-white px-10 py-[30px] shadow-soft transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-counter-top active:translate-y-0"
            >
              <Image
                src={icon}
                alt=""
                width={140}
                height={140}
                className="size-35"
              />
              <span className="flex flex-col items-center gap-2.5 text-center">
                <span className="font-display text-[32px] font-bold leading-10 text-ink">
                  {title}
                </span>
                <span className="w-[322px] font-display text-[24px] font-medium leading-[30px] text-muted">
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
