"use client";

import {
  Building,
  ClipboardList,
  House,
  Monitor,
  UserStar,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Beranda", icon: House },
  { href: "/admin/antrean", label: "Antrean", icon: Users },
  { href: "/admin/loket", label: "Loket", icon: Building },
  { href: "/admin/layanan", label: "Layanan", icon: ClipboardList },
  { href: "/admin/display", label: "Display", icon: Monitor },
  { href: "/admin/ulasan", label: "Ulasan", icon: UserStar },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[261px] shrink-0 flex-col justify-between bg-white px-[25px] py-[50px]">
      <div className="flex flex-col gap-[70px]">
        <Link
          href="/admin"
          className="flex items-center justify-center gap-[15px]"
        >
          <Image
            src="/images/civigo-mark.svg"
            alt=""
            width={91}
            height={91}
            className="size-[55px] rounded-full"
          />
          <span className="text-[36px] font-extrabold text-brand">CiviGo</span>
        </Link>

        <nav className="flex flex-col gap-[15px]">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-[15px] rounded-[10px] border-r-[3px] px-5 py-3 font-display text-[18px] font-medium transition-colors ${
                  isActive
                    ? "border-brand bg-nav-active text-brand"
                    : "border-transparent text-queue-idle hover:bg-board"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col justify-center gap-2 rounded-[15px] bg-board px-5 py-[15px] shadow-soft">
        <p className="text-[16px] font-bold text-ink">Disdukcapil MPP Siola</p>
        <p className="text-[14px] font-medium text-ink">Surabaya</p>
      </div>
    </aside>
  );
}
