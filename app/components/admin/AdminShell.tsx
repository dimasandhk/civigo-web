"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AdminShell({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-board">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Header (hanya muncul di layar kecil < lg) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="cursor-pointer rounded-lg p-1.5 text-ink hover:bg-board focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="Buka navigasi sidebar"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/images/civigo-mark.svg"
                alt=""
                width={32}
                height={32}
                className="size-7 rounded-full"
              />
              <span className="text-[20px] font-extrabold text-brand">
                CiviGo
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold leading-tight text-ink">
              Disdukcapil MPP Siola
            </p>
            <p className="text-[11px] font-medium text-muted">Surabaya</p>
          </div>
        </header>

        {/* Konten Utama Halaman dengan Padding Responsif */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
