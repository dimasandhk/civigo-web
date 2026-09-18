import type { Metadata } from "next";
import PageHeader from "../../components/admin/PageHeader";
import LoketTableManager from "../../components/admin/LoketTableManager";
import { getAdminCounters, resolveAgencyId } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Loket — CiviGo",
};

export default async function LoketPage() {
  const counters = await getAdminCounters(await resolveAgencyId());

  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader
        title="Loket"
        description="Kelola loket yang melayani antrean"
      />

      <LoketTableManager initialCounters={counters} />
    </div>
  );
}

