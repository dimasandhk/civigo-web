import type { Metadata } from "next";
import PageHeader from "../../components/admin/PageHeader";
import AntreanManager from "../../components/admin/AntreanManager";
import { getAdminCounters, getTodayQueues } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Antrean — CiviGo",
};

export default async function AntreanPage() {
  const [counters, queues] = await Promise.all([
    getAdminCounters(1),
    getTodayQueues(1),
  ]);

  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Antrean"
        description="Kelola antrean di loket pelayanan"
      />

      <AntreanManager
        counters={counters.map((c) => ({ id: c.id, name: c.name }))}
        initialQueues={queues}
      />
    </div>
  );
}
