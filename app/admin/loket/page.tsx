import type { Metadata } from "next";
import PageHeader from "../../components/admin/PageHeader";
import LoketTableManager from "../../components/admin/LoketTableManager";
import { getAdminCounters, resolveAgencyContext } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Loket — CiviGo",
};

export default async function LoketPage() {
  const context = await resolveAgencyContext();
  const counters = await getAdminCounters(context.agencyId, context.locationId);

  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader
        title="Loket"
        description={
          context.locationName
            ? `Kelola loket yang melayani antrean — ${context.locationName}`
            : "Kelola loket yang melayani antrean"
        }
      />

      <LoketTableManager initialCounters={counters} />
    </div>
  );
}

