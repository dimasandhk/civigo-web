"use client";

import { useId, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Banknote,
  Calendar,
  CarFront,
  CheckCircle2,
  Clock,
  FileText,
  House,
  IdCard,
  Loader2,
  Mail,
  Printer,
  Search,
  Smartphone,
  TicketsPlane,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type KioskService = {
  id: number;
  name: string;
  estimated_time: number | null;
  agency_id: number | null;
  agency: {
    id: number;
    name: string;
    open_time: string;
    close_time: string;
    operating_days: number[];
  } | null;
  requirements?: string[];
  output_documents?: string[];
};

type IssuedTicket = {
  id: string;
  queue_number: string;
  schedule_date: string;
  /** Selalu null dari kios: walk-in tidak memilih sesi jam (sejak 06/10/2026). */
  time_block: string | null;
  status: string;
  estimated_finish: string;
  nik: string | null;
  service: { id: number; name: string; estimated_time: number };
  agency: { id: number; name: string };
  linked_account: boolean;
};

function getServiceIconAndColor(name: string): {
  icon: LucideIcon;
  bg: string;
  color: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes("ktp")) {
    return { icon: IdCard, bg: "#EBE2FF", color: "#3800B1" };
  }
  if (lower.includes("kartu keluarga") || lower.includes("kk")) {
    return { icon: House, bg: "#E4FFE2", color: "#0F7100" };
  }
  if (lower.includes("stnk") || lower.includes("sim") || lower.includes("kendaraan")) {
    return { icon: CarFront, bg: "#CFEEFF", color: "#0081D8" };
  }
  if (lower.includes("pajak")) {
    return { icon: Banknote, bg: "#FFEED0", color: "#D48600" };
  }
  if (lower.includes("skck")) {
    return { icon: Mail, bg: "#FFFCCB", color: "#E0BE00" };
  }
  if (lower.includes("paspor")) {
    return { icon: TicketsPlane, bg: "#FFE1E1", color: "#C30003" };
  }
  if (lower.includes("digital") || lower.includes("ikd")) {
    return { icon: Smartphone, bg: "#E0F2FE", color: "#0369A1" };
  }
  return { icon: FileText, bg: "#F1F5F9", color: "#475569" };
}

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "08:00:00" -> "08:00" */
function shortTime(value: string | undefined): string {
  return (value ?? "").slice(0, 5);
}

export default function KioskServiceSelection({
  services,
  locationId,
}: {
  services: KioskService[];
  /** Cabang tempat kios dipasang; tiket walk-in dicatat di sini. */
  locationId: number;
}) {
  const searchInputId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string>("all");

  // Booking Modal state
  const [selectedService, setSelectedService] = useState<KioskService | null>(null);
  const [targetDate, setTargetDate] = useState<string>(getTodayJakarta());
  const [nik, setNik] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null);

  const agencies = useMemo(() => {
    const map = new Map<number, string>();
    services.forEach((s) => {
      if (s.agency) map.set(s.agency.id, s.agency.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.agency?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesAgency =
        selectedAgencyFilter === "all" ||
        String(s.agency?.id) === selectedAgencyFilter;
      return matchesSearch && matchesAgency;
    });
  }, [services, searchQuery, selectedAgencyFilter]);

  const handleOpenModal = (service: KioskService) => {
    setSelectedService(service);
    setTargetDate(getTodayJakarta());
    setNik("");
    setBookingError(null);
    setIssuedTicket(null);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
    setIssuedTicket(null);
    setBookingError(null);
    setNik("");
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    if (!/^[0-9]{16}$/.test(nik.trim())) {
      setBookingError("NIK wajib terdiri dari 16 digit angka.");
      return;
    }

    setBookingError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/queue/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            service_id: selectedService.id,
            schedule_date: targetDate,
            location_id: locationId,
            // Tanpa time_block: walk-in dilayani sesuai urutan nomor. Server tetap
            // menolak kalau layanan tidak akan selesai sebelum jam tutup.
            nik: nik.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setBookingError(data?.error?.message ?? "Gagal mengambil nomor antrean. Silakan coba lagi.");
        } else {
          // Untuk pendaftaran walk-in langsung di kiosk pada hari ini, otomatis catat kehadiran (check-in)
          if (targetDate === getTodayJakarta()) {
            await fetch("/api/queue/check-in", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "omit",
              body: JSON.stringify({ code: data.ticket.queue_number }),
            }).catch(() => {});
          }
          setIssuedTicket(data.ticket);
        }
      } catch {
        setBookingError("Gagal menghubungi server. Periksa koneksi jaringan.");
      }
    });
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center justify-center gap-4 sm:gap-5">
      {/* Search Bar */}
      <div className="relative w-full max-w-[750px]">
        <label htmlFor={searchInputId} className="sr-only">
          Cari layanan atau instansi pemerintahan
        </label>
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-queue-idle"
        />
        <input
          id={searchInputId}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari layanan (KTP, KK, SIM, Paspor) atau instansi..."
          className="w-full rounded-[16px] bg-white py-3.5 pl-12 pr-4 font-display text-sm sm:text-base text-ink shadow-soft outline-none placeholder:text-queue-idle focus-visible:ring-2 focus-visible:ring-brand"
        />
      </div>

      {/* Agency Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedAgencyFilter("all")}
          className={`cursor-pointer rounded-full px-4 py-1.5 font-display text-xs sm:text-sm font-medium transition-colors ${
            selectedAgencyFilter === "all"
              ? "bg-brand text-white shadow-xs"
              : "bg-white text-ink hover:bg-board border border-line"
          }`}
        >
          Semua Instansi
        </button>
        {agencies.map((agency) => (
          <button
            key={agency.id}
            type="button"
            onClick={() => setSelectedAgencyFilter(String(agency.id))}
            className={`cursor-pointer rounded-full px-4 py-1.5 font-display text-xs sm:text-sm font-medium transition-colors ${
              selectedAgencyFilter === String(agency.id)
                ? "bg-brand text-white shadow-xs"
                : "bg-white text-ink hover:bg-board border border-line"
            }`}
          >
            {agency.name}
          </button>
        ))}
      </div>

      {/* Grid Layanan */}
      <section className="w-full">
        {filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] bg-white p-10 text-center shadow-soft">
            <p className="font-display text-base font-medium text-queue-idle">
              Tidak ada layanan yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const { icon: Icon, bg, color } = getServiceIconAndColor(service.name);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleOpenModal(service)}
                  className="group flex cursor-pointer items-start gap-4 rounded-[18px] bg-white p-4 sm:p-5 text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-card focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span
                    className="flex size-13 shrink-0 items-center justify-center rounded-[14px] transition-transform group-hover:scale-105"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={28} strokeWidth={1.5} style={{ color }} />
                  </span>
                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    <span className="font-display text-xs font-semibold uppercase tracking-wider text-brand">
                      {service.agency?.name ?? "Instansi"}
                    </span>
                    <h3 className="font-display text-base font-semibold leading-snug text-ink line-clamp-2">
                      {service.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-queue-idle">
                      <Clock size={13} />
                      <span>Est. {service.estimated_time ?? 15} menit</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Dialog Walk-in Booking & Tiket */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          {issuedTicket ? (
            /* Printable Receipt Card */
            <div className="relative flex w-full max-w-[480px] flex-col items-center gap-5 rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 rounded-full p-2 text-queue-idle hover:bg-board hover:text-ink transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={36} />
              </div>

              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-ink">
                  Tiket Berhasil Diterbitkan!
                </h2>
                <p className="font-display text-xs text-queue-idle mt-1">
                  Harap perhatikan nomor antrean pada monitor display
                </p>
              </div>

              {/* Receipt Visual */}
              <div className="flex w-full flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-brand/40 bg-brand-tint/30 p-6">
                <span className="text-xs font-semibold uppercase tracking-widest text-brand">
                  Nomor Antrean
                </span>
                <span className="font-display text-6xl font-extrabold text-brand tracking-tight">
                  {issuedTicket.queue_number}
                </span>
                <div className="flex flex-col items-center text-center gap-1 text-sm font-medium text-ink">
                  <span className="font-semibold">{issuedTicket.service.name}</span>
                  <span className="text-xs text-queue-idle">{issuedTicket.agency.name}</span>
                </div>
                <div className="mt-2 flex w-full justify-around border-t border-brand/20 pt-3 text-xs text-ink">
                  <div className="text-center">
                    <span className="text-queue-idle block">Tanggal</span>
                    <span className="font-semibold">{issuedTicket.schedule_date}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-queue-idle block">Estimasi Layanan</span>
                    <span className="font-semibold">± {issuedTicket.service.estimated_time} menit</span>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-line py-3 font-display text-sm font-semibold text-ink hover:bg-board transition-colors"
                >
                  <Printer size={16} />
                  <span>Cetak Struk</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 cursor-pointer rounded-[12px] bg-brand py-3 font-display text-sm font-semibold text-white shadow-soft hover:opacity-95 transition-opacity"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* Walk-in Form Modal */
            <div className="relative flex w-full max-w-[520px] max-h-[90vh] flex-col overflow-y-auto rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 rounded-full p-2 text-queue-idle hover:bg-board hover:text-ink transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <header className="flex flex-col gap-1 pb-4 border-b border-line">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {selectedService.agency?.name ?? "Instansi"}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {selectedService.name}
                </h2>
                <span className="flex items-center gap-1 text-xs text-queue-idle">
                  <Clock size={14} /> Estimasi pengerjaan: {selectedService.estimated_time ?? 15} menit
                </span>
                {selectedService.agency && (
                  <span className="text-xs text-queue-idle">
                    Jam layanan {shortTime(selectedService.agency.open_time)} –{" "}
                    {shortTime(selectedService.agency.close_time)}. Dilayani sesuai urutan nomor antrean.
                  </span>
                )}
              </header>
 
              {((selectedService.output_documents && selectedService.output_documents.length > 0) ||
                (selectedService.requirements && selectedService.requirements.length > 0)) && (
                <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-line bg-board/30 p-3.5 text-xs">
                  {selectedService.output_documents && selectedService.output_documents.length > 0 && (
                    <div>
                      <span className="font-semibold text-emerald-800 uppercase tracking-wider text-[11px] block">
                        Dokumen yang Diterbitkan:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedService.output_documents.map((doc, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                          >
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedService.requirements && selectedService.requirements.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] block">
                        Persyaratan Dokumen:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedService.requirements.map((req, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {bookingError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                  <p>{bookingError}</p>
                </div>
              )}

              <form onSubmit={handleBook} className="mt-5 flex flex-col gap-4">
                {/* Tanggal Layanan */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="service-date" className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-ink">
                    <Calendar size={14} className="text-brand" />
                    <span>Tanggal Layanan</span>
                  </label>
                  <input
                    id="service-date"
                    type="date"
                    min={getTodayJakarta()}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-[12px] border border-line bg-board/40 px-3.5 py-2.5 font-display text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                {/* Input NIK */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kiosk-nik" className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-ink">
                    <User size={14} className="text-brand" />
                    <span>Nomor Induk Kependudukan (NIK)</span>
                  </label>
                  <input
                    id="kiosk-nik"
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masukkan 16 digit NIK Anda"
                    required
                    className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2.5 font-display text-sm tracking-wider text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <span className="text-[11px] text-queue-idle">
                    Wajib 16 digit angka sesuai KTP atau Kartu Keluarga
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isPending || nik.length !== 16}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-counter-top to-counter-bottom py-3.5 font-display text-sm font-semibold text-white shadow-soft transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Menerbitkan Nomor Antrean...</span>
                    </>
                  ) : (
                    <span>Ambil Nomor Antrean</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
