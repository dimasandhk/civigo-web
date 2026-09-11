"use client";

import {
  Building,
  ClipboardList,
  House,
  LogOut,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  UserStar,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/actions";
import DisplayConfirmModal from "./DisplayConfirmModal";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Beranda", icon: House },
  { href: "/admin/antrean", label: "Antrean", icon: Users },
  { href: "/admin/loket", label: "Loket", icon: Building },
  { href: "/admin/layanan", label: "Layanan", icon: ClipboardList },
  { href: "/display/antrean", label: "Display", icon: Monitor },
  { href: "/admin/ulasan", label: "Ulasan", icon: UserStar },
];

export type SidebarProps = {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function Sidebar({
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);

  return (
    <>
      {/* Backdrop Gelap untuk Layar Mobile (< lg) saat Sidebar Terbuka */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen shrink-0 flex-col justify-between bg-white shadow-soft transition-all duration-300 ease-in-out lg:sticky lg:top-0 ${
          isCollapsed ? "lg:w-[84px] lg:px-3" : "lg:w-[260px] lg:px-4"
        } w-[270px] px-4 py-5 sm:py-6 ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Bagian Atas: Header Logo & Navigasi */}
        <div className="flex flex-col gap-6">
          {/* Header Sidebar (Logo + Tombol Toggle/Close) */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              onClick={onCloseMobile}
              className={`flex items-center gap-3 transition-opacity hover:opacity-90 ${
                isCollapsed ? "lg:justify-center lg:w-full" : ""
              }`}
            >
              <Image
                src="/images/civigo-mark.svg"
                alt="CiviGo"
                width={91}
                height={91}
                className="size-10 shrink-0 rounded-full"
              />
              {!isCollapsed && (
                <span className="font-display text-[26px] font-extrabold tracking-tight text-brand">
                  CiviGo
                </span>
              )}
            </Link>

            {/* Tombol Tutup Mobile (X) */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-board hover:text-ink lg:hidden"
              aria-label="Tutup sidebar"
            >
              <X size={20} />
            </button>

            {/* Tombol Toggle Collapse Desktop */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`hidden cursor-pointer rounded-lg p-1.5 text-muted hover:bg-board hover:text-ink lg:flex ${
                  isCollapsed ? "lg:hidden" : ""
                }`}
                title="Tutup/Kecilkan sidebar"
                aria-label="Tutup/Kecilkan sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {/* Tombol Buka saat di-collapse (Desktop) */}
          {isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden size-full cursor-pointer items-center justify-center rounded-lg p-2 text-muted hover:bg-board hover:text-ink lg:flex"
              title="Buka sidebar penuh"
              aria-label="Buka sidebar penuh"
            >
              <PanelLeftOpen size={20} />
            </button>
          )}

          {/* Navigasi Menu */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              const isDisplay = href.startsWith("/display");

              const handleClick = (e: React.MouseEvent) => {
                if (isDisplay) {
                  e.preventDefault();
                  setIsDisplayModalOpen(true);
                  if (onCloseMobile) onCloseMobile();
                } else if (onCloseMobile) {
                  onCloseMobile();
                }
              };

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={handleClick}
                  title={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center rounded-[10px] py-2.5 font-display text-[16px] font-medium transition-colors ${
                    isCollapsed
                      ? "justify-center px-2"
                      : "gap-3.5 px-4"
                  } ${
                    isActive
                      ? "border-r-[3px] border-brand bg-brand-tint text-brand"
                      : "border-r-[3px] border-transparent text-queue-idle hover:bg-board hover:text-ink"
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  {!isCollapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bagian Bawah: Info Instansi & Tombol Keluar */}
        <div className="flex flex-col gap-2">
          <div
            className={`flex items-center rounded-[12px] bg-board shadow-soft transition-all ${
              isCollapsed
                ? "justify-center p-2.5 text-center"
                : "justify-between p-3"
            }`}
            title="Disdukcapil MPP Siola - Surabaya"
          >
            {isCollapsed ? (
              <div className="flex size-8 items-center justify-center rounded-md bg-brand-tint font-display text-[12px] font-bold text-brand">
                DS
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 overflow-hidden pr-2">
                <p className="truncate text-[13px] font-bold leading-tight text-ink">
                  Disdukcapil MPP Siola
                </p>
                <p className="text-[11px] font-medium text-muted">Surabaya</p>
              </div>
            )}

            {!isCollapsed && (
              <button
                type="button"
                onClick={() => signOut()}
                className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-queue-idle transition-colors hover:bg-danger/10 hover:text-danger"
                title="Keluar dari akun"
                aria-label="Keluar"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <button
              type="button"
              onClick={() => signOut()}
              className="flex cursor-pointer items-center justify-center rounded-[10px] p-2 text-queue-idle transition-colors hover:bg-danger/10 hover:text-danger"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Modal Dialog Konfirmasi saat mengklik Display */}
      <DisplayConfirmModal
        isOpen={isDisplayModalOpen}
        onClose={() => setIsDisplayModalOpen(false)}
      />
    </>
  );
}
