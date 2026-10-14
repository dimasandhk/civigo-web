import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, isUuid, type Failure } from "./shared";

export type CancelSuccess = {
  ok: true;
  message: string;
  ticket: {
    id: string;
    queue_number: string;
    status: "canceled";
    canceled_at: string;
    cancel_reason: string | null;
  };
};

export type CancelResult = CancelSuccess | Failure;

/**
 * Membatalkan antrean oleh warga secara sukarela.
 * Hanya tiket berstatus 'scheduled' atau 'present' yang dapat dibatalkan.
 * Tiket yang sedang dilayani ('served') atau sudah selesai/hangus/batal ditolak.
 */
export async function cancelQueue(
  id: string,
  rawReason?: unknown
): Promise<CancelResult> {
  if (!id || !isUuid(id)) {
    return fail(400, "INVALID_ID", "ID tiket tidak valid. Format harus UUID.");
  }

  const cancelReason =
    typeof rawReason === "string" && rawReason.trim().length > 0
      ? rawReason.trim().slice(0, 500)
      : null;

  const supabase = createServiceClient();
  const { data: ticket, error } = await supabase
    .from("queues")
    .select(
      `
      id,
      queue_number,
      status,
      user_id,
      nik,
      family_member_id,
      location_id,
      service:services(agency_id)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal membaca data tiket: ${error.message}`);
  }

  if (!ticket) {
    return fail(404, "TICKET_NOT_FOUND", `Tiket dengan id "${id}" tidak ditemukan.`);
  }

  // Verifikasi otorisasi kepemilikan
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return fail(401, "UNAUTHORIZED", "Silakan login terlebih dahulu untuk membatalkan tiket.");
  }

  // Jika warga biasa, wajib memiliki tiket tersebut atau tiket anggota keluarganya
  if (currentUser.role === "user") {
    const isDirectOwner = ticket.user_id === currentUser.id;
    const isNikOwner = currentUser.nik && ticket.nik === currentUser.nik;

    let isFamilyOwner = false;
    if (ticket.family_member_id) {
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("id", ticket.family_member_id)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (familyMember) isFamilyOwner = true;
    }

    if (!isDirectOwner && !isNikOwner && !isFamilyOwner) {
      return fail(403, "FORBIDDEN", "Anda tidak memiliki hak akses untuk membatalkan antrean ini.");
    }
  }

  // Guard status: hanya boleh dibatalkan jika scheduled atau present
  if (ticket.status === "served") {
    return fail(
      422,
      "TICKET_ALREADY_SERVED",
      "Nomor antrean Anda sedang atau sudah dipanggil di loket dan tidak dapat dibatalkan."
    );
  }

  if (ticket.status === "completed") {
    return fail(
      422,
      "TICKET_ALREADY_COMPLETED",
      "Nomor antrean ini sudah selesai dilayani dan tidak dapat dibatalkan."
    );
  }

  if (ticket.status === "skipped") {
    return fail(
      422,
      "TICKET_ALREADY_SKIPPED",
      "Nomor antrean ini telah hangus dan tidak dapat dibatalkan."
    );
  }

  if (ticket.status === "canceled") {
    return fail(
      422,
      "TICKET_ALREADY_CANCELED",
      "Nomor antrean ini sudah dibatalkan sebelumnya."
    );
  }

  if (ticket.status !== "scheduled" && ticket.status !== "present") {
    return fail(
      422,
      "INVALID_TICKET_STATUS",
      `Tiket dengan status "${ticket.status}" tidak dapat dibatalkan.`
    );
  }

  const now = new Date().toISOString();

  // Pembaruan atomik dengan kondisi WHERE status IN ('scheduled', 'present')
  // untuk mencegah race condition jika petugas loket baru saja memanggil tiket
  const { data: updated, error: updateError } = await supabase
    .from("queues")
    .update({
      status: "canceled",
      canceled_at: now,
      cancel_reason: cancelReason,
    })
    .eq("id", id)
    .in("status", ["scheduled", "present"])
    .select("id, queue_number, status, canceled_at, cancel_reason")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Gagal membatalkan tiket: ${updateError.message}`);
  }

  if (!updated) {
    return fail(
      422,
      "TICKET_STATUS_CHANGED",
      "Status antrean telah berubah sebelum pembatalan dapat diproses. Silakan muat ulang halaman."
    );
  }

  // Broadcast realtime ke kanal display instansi agar monitor TV dan dashboard langsung update
  const rawService = ticket.service as unknown as { agency_id?: number } | null;
  const agencyId = rawService?.agency_id;
  if (agencyId) {
    try {
      const channel = supabase.channel(`display:agency:${agencyId}`);
      await channel.send({
        type: "broadcast",
        event: "queue_update",
        payload: {
          event: "canceled",
          ticket_id: id,
          queue_number: ticket.queue_number,
        },
      });
      supabase.removeChannel(channel);
    } catch {
      // Broadcast fail-soft: tidak boleh membatalkan respons sukses
    }
  }

  return {
    ok: true,
    message: `Nomor antrean ${ticket.queue_number} berhasil dibatalkan.`,
    ticket: {
      id: updated.id,
      queue_number: updated.queue_number,
      status: "canceled",
      canceled_at: updated.canceled_at ?? now,
      cancel_reason: updated.cancel_reason,
    },
  };
}
