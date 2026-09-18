import type { ReactNode } from "react";
import { requireOfficer } from "@/lib/auth/session";
import { resolveAgencyContext } from "@/lib/data/admin";
import AdminShell from "../components/admin/AdminShell";

/**
 * Guards every `/admin` route. The pages below read queue data with the
 * service_role client, which bypasses RLS, so this check is the access control
 * — there is no policy behind it to catch a mistake.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOfficer();
  const context = await resolveAgencyContext();

  return (
    <AdminShell
      agencyId={context.agencyId}
      agencyName={context.agencyName}
      locationName={context.locationName}
    >
      {children}
    </AdminShell>
  );
}
