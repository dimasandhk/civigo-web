import {
  CheckCheck,
  Clock,
  UserRoundArrowLeft,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import ActiveFacilitiesCard from "../components/admin/ActiveFacilitiesCard";
import MetricCard, { type MetricCardProps } from "../components/admin/MetricCard";
import PageHeader from "../components/admin/PageHeader";
import PerformanceCard from "../components/admin/PerformanceCard";
import RangeSelect from "../components/admin/RangeSelect";
import ServiceDonutChart from "../components/admin/ServiceDonutChart";
import WeeklyQueueChart from "../components/admin/WeeklyQueueChart";

import {
  getAdminDashboardStats,
  getQueueOutcome,
  getServiceDonutData,
  getWeeklyQueueData,
  resolveAgencyContext,
} from "@/lib/data/admin";
import { parseDateRange } from "@/lib/queue/time";

export const metadata: Metadata = {
  title: "Beranda — CiviGo",
};

export default async function AdminBerandaPage({ searchParams }: PageProps<"/admin">) {
  const [context, params] = await Promise.all([resolveAgencyContext(), searchParams]);

  // Rentang tiap kartu disimpan di URL (?kehadiran=&hangus=&layanan=), nilai asing
  // dianggap default. Kartu metrik di baris pertama tetap "hari ini".
  const ranges = {
    kehadiran: parseDateRange(params.kehadiran, "hari-ini"),
    hangus: parseDateRange(params.hangus, "hari-ini"),
    layanan: parseDateRange(params.layanan, "minggu-ini"),
  };

  const [stats, attendance, skipped, donutItems, weeklyData] = await Promise.all([
    getAdminDashboardStats(context.agencyId, context.locationId),
    getQueueOutcome(context.agencyId, context.locationId, ranges.kehadiran),
    getQueueOutcome(context.agencyId, context.locationId, ranges.hangus),
    getServiceDonutData(context.agencyId, context.locationId, ranges.layanan),
    getWeeklyQueueData(context.agencyId, context.locationId),
  ]);

  const attendanceResolved = attendance.attended + attendance.skipped;

  const metricCards: MetricCardProps[] = [
    {
      icon: Users,
      iconBg: "#E2E8FF",
      iconColor: "#2248DF",
      label: "Total Antrean",
      value: String(stats.totalToday),
      unit: "orang",
      trend: "↑ Hari ini",
      trendType: "positive",
    },
    {
      icon: CheckCheck,
      iconBg: "#E2FFE6",
      iconColor: "#0D892D",
      label: "Selesai Dilayani",
      value: String(stats.completedToday),
      unit: "orang",
      trend: "↑ Hari ini",
      trendType: "positive",
    },
    {
      icon: UserRoundArrowLeft,
      iconBg: "#FFEED0",
      iconColor: "#D48600",
      label: "Sisa Antrean",
      value: String(stats.remainingToday),
      unit: "orang",
      trend: "Menunggu giliran",
      trendType: "danger",
    },
    {
      icon: Clock,
      iconBg: "#FDE2FF",
      iconColor: "#A020F0",
      label: "Rata-rata Waktu",
      // `null` = belum bisa dihitung (belum ada waktu mulai dilayani). Dulu tampil "null menit".
      value: stats.avgTimeMinutes === null ? "-" : String(stats.avgTimeMinutes),
      unit: stats.avgTimeMinutes === null ? "" : "menit",
      trend: stats.avgTimeMinutes === null ? "Belum bisa dihitung" : "Estimasi per layanan",
      trendType: "positive",
    },
  ];

  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Beranda"
        description={
          context.locationName
            ? `Lihat ringkasan dan kondisi antrean hari ini — ${context.locationName}`
            : "Lihat ringkasan dan kondisi antrean hari ini"
        }
      />

      {/* Baris 1: 4 Kartu Metrik KPI Utama */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {/* Baris 2: Kehadiran, Antrean Hangus, dan Fasilitas Aktif */}
      <div className="flex flex-col gap-5 lg:flex-row">
        <PerformanceCard
          title="Tingkat Kehadiran"
          filter={
            <RangeSelect
              param="kehadiran"
              value={ranges.kehadiran}
              current={ranges}
              label="Rentang tingkat kehadiran"
            />
          }
          icon={UserRoundCheck}
          iconBg="#E2FFEA"
          iconColor="#16A34A"
          // Dulu "null%" kalau belum ada tiket.
          value={attendance.attendanceRate === null ? "-" : `${attendance.attendanceRate}%`}
          trend={
            attendanceResolved > 0
              ? `${attendance.attended} dari ${attendanceResolved} tiket hadir`
              : "Belum ada tiket hadir atau hangus"
          }
          trendType="positive"
        />

        <PerformanceCard
          title="Antrean Hangus"
          filter={
            <RangeSelect
              param="hangus"
              value={ranges.hangus}
              current={ranges}
              label="Rentang antrean hangus"
            />
          }
          icon={UserRoundX}
          iconBg="#FFE2E2"
          iconColor="#DC2626"
          value={String(skipped.skipped)}
          trend="Tidak hadir saat dipanggil"
          trendType="danger"
        />

        <ActiveFacilitiesCard
          activeCounters={stats.activeCounters}
          activeServices={stats.activeServices}
        />
      </div>

      {/* Baris 3: Grafik Layanan & Mingguan */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ServiceDonutChart
          items={donutItems}
          filter={
            <RangeSelect
              param="layanan"
              value={ranges.layanan}
              current={ranges}
              label="Rentang antrean per layanan"
            />
          }
          className="lg:col-span-5"
        />
        <WeeklyQueueChart
          points={weeklyData.points}
          yAxisGrid={weeklyData.yAxisGrid}
          className="lg:col-span-7"
        />
      </div>
    </div>
  );
}
