import { getCurrentUser } from "@/lib/auth/session";
import type { createServiceClient } from "@/lib/supabase/service";
import { fail, type Failure, type QueueStatus } from "./shared";

/**
 * Authorization for the queue endpoints.
 *
 * `queues` has a single RLS policy — `auth.uid() = user_id` — which hides every
 * other citizen's ticket from an officer. These endpoints therefore run on the
 * service_role client, where RLS is off entirely, and the checks below are the
 * only thing standing between an officer and another agency's tickets. Nothing
 * downstream will catch a mistake here.
 */

export type Caller =
  | { kind: "anonymous" }
  | { kind: "citizen"; userId: string }
  | { kind: "officer"; userId: string; agencyId: number }
  | { kind: "superAdmin"; userId: string };

export async function resolveCaller(): Promise<Caller> {
  const profile = await getCurrentUser();

  if (!profile) return { kind: "anonymous" };

  if (profile.role === "instansi") {
    // The users_agency_matches_role CHECK guarantees this is set, but a null
    // here would silently widen access to every agency, so it is worth a guard.
    if (profile.agency_id === null) return { kind: "anonymous" };
    return { kind: "officer", userId: profile.id, agencyId: profile.agency_id };
  }

  if (profile.role === "super_admin") return { kind: "superAdmin", userId: profile.id };

  return { kind: "citizen", userId: profile.id };
}

export type TicketContext = {
  ticket: {
    id: string;
    user_id: string | null;
    nik: string | null;
    queue_number: string;
    schedule_date: string;
    time_block: string;
    status: QueueStatus;
    counter_id: number | null;
    service_id: number | null;
    rescheduled_from: string | null;
  };
  service: { id: number; name: string; estimated_time: number | null; agency_id: number };
  agency: { id: number; name: string; open_time: string; close_time: string };
};

/** Loads a ticket together with the service and agency it belongs to. */
export async function loadTicketContext(
  db: ReturnType<typeof createServiceClient>,
  ticketId: string,
): Promise<TicketContext | Failure> {
  const { data: ticket } = await db
    .from("queues")
    .select(
      "id, user_id, nik, queue_number, schedule_date, time_block, status, counter_id, service_id, rescheduled_from",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) {
    return fail(404, "TICKET_NOT_FOUND", "Tiket antrean tidak ditemukan.");
  }

  if (ticket.service_id === null) {
    return fail(422, "TICKET_HAS_NO_SERVICE", "Tiket ini tidak terhubung ke layanan mana pun.");
  }

  const { data: service } = await db
    .from("services")
    .select("id, name, estimated_time, agency_id")
    .eq("id", ticket.service_id)
    .maybeSingle();

  if (!service || service.agency_id === null) {
    return fail(
      422,
      "SERVICE_HAS_NO_AGENCY",
      "Layanan pada tiket ini tidak terhubung ke instansi mana pun.",
    );
  }

  const { data: agency } = await db
    .from("agencies")
    .select("id, name, open_time, close_time")
    .eq("id", service.agency_id)
    .maybeSingle();

  if (!agency) {
    return fail(404, "AGENCY_NOT_FOUND", "Instansi penyelenggara layanan ini tidak ditemukan.");
  }

  return {
    ticket: { ...ticket, status: ticket.status as QueueStatus, service_id: ticket.service_id },
    service: { ...service, agency_id: service.agency_id },
    agency,
  };
}

/**
 * Officer-only actions: everything an admin presses in the web dashboard.
 * A `super_admin` has global scope and passes for any agency.
 */
export function requireAgencyAccess(caller: Caller, agencyId: number): Failure | null {
  if (caller.kind === "superAdmin") return null;

  if (caller.kind === "officer") {
    if (caller.agencyId !== agencyId) {
      return fail(403, "WRONG_AGENCY", "Tiket ini milik instansi lain.");
    }
    return null;
  }

  if (caller.kind === "citizen") {
    return fail(403, "OFFICER_ONLY", "Aksi ini hanya untuk petugas instansi.");
  }

  return fail(401, "UNAUTHENTICATED", "Silakan login sebagai petugas instansi terlebih dahulu.");
}
