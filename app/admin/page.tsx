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
import ServiceDonutChart from "../components/admin/ServiceDonutChart";
import WeeklyQueueChart from "../components/admin/WeeklyQueueChart";

import { getAdminDashboardStats } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Beranda — CiviGo",
};

export default async function AdminBerandaPage() {
  const stats = await getAdminDashboardStats(1);

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
      value: String(stats.avgTimeMinutes),
      unit: "menit",
      trend: "Estimasi per layanan",
      trendType: "positive",
    },
  ];

  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Beranda"
        description="Lihat ringkasan dan kondisi antrean hari ini"
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
          icon={UserRoundCheck}
          iconBg="#E2FFEA"
          iconColor="#16A34A"
          value={`${stats.attendanceRate}%`}
          trend="Hadir tepat waktu"
          trendType="positive"
        />

        <PerformanceCard
          title="Antrean Hangus"
          icon={UserRoundX}
          iconBg="#FFE2E2"
          iconColor="#DC2626"
          value={String(stats.skippedCount)}
          trend="Tidak hadir / hangus"
          trendType="danger"
        />

        <ActiveFacilitiesCard
          activeCounters={stats.activeCounters}
          activeServices={stats.activeServices}
        />
      </div>

      {/* Baris 3: Grafik Layanan & Mingguan */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ServiceDonutChart className="lg:col-span-5" />
        <WeeklyQueueChart className="lg:col-span-7" />
      </div>
    </div>
  );
}
