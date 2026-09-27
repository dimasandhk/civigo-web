import type { Metadata } from "next";
import LayananManager from "../../components/admin/LayananManager";
import PageHeader from "../../components/admin/PageHeader";

import {
  getAdminServices,
  getServiceDocuments,
  resolveAgencyId,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Layanan — CiviGo",
};

export default async function LayananPage() {
  const agencyId = await resolveAgencyId();
  const [services, documents] = await Promise.all([
    getAdminServices(agencyId),
    getServiceDocuments(agencyId),
  ]);

  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader
        title="Layanan"
        description="Kelola daftar layanan yang tersedia di instansi Anda"
      />

      <LayananManager initialServices={services} documents={documents} />
    </div>
  );
}
