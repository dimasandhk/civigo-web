import type { ReactNode } from "react";
import { requireOfficer } from "@/lib/auth/session";
import { resolveAgencyId } from "@/lib/data/admin";
import AdminShell from "../components/admin/AdminShell";

/**
 * Guards every `/admin` route. The pages below read queue data with the
 * service_role client, which bypasses RLS, so this check is the access control
 * — there is no policy behind it to catch a mistake.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOfficer();

  return <AdminShell agencyId={await resolveAgencyId()}>{children}</AdminShell>;
}
