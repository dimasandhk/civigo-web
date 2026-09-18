import type { Metadata } from "next";
import PageHeader from "../../components/admin/PageHeader";
import AntreanManager from "../../components/admin/AntreanManager";
import { getAdminCounters, getTodayQueues, resolveAgencyContext } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Antrean — CiviGo",
};

export default async function AntreanPage() {
  const context = await resolveAgencyContext();

  const [counters, queues] = await Promise.all([
    getAdminCounters(context.agencyId, context.locationId),
    getTodayQueues(context.agencyId, context.locationId),
  ]);

  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Antrean"
        description={
          context.locationName
            ? `Kelola antrean di loket pelayanan — ${context.locationName}`
            : "Kelola antrean di loket pelayanan"
        }
      />

      <AntreanManager
        counters={counters.map((c) => ({ id: c.id, name: c.name }))}
        initialQueues={queues}
      />
    </div>
  );
}
