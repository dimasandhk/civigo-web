import { getCurrentUser } from "@/lib/auth/session";
import { fail, type Failure } from "./shared";
import { createServiceClient } from "@/lib/supabase/service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReviewLaterRow {
  id: string;
  queue_number: string;
  status: string;
  is_reviewed: boolean | null;
}

export type ReviewLaterResult =
  | { ok: true; message: string; ticket: ReviewLaterRow }
  | Failure;

/**
 * markReviewLater / reviewLater — Menandai tiket antrean yang telah berstatus `completed`
 * dengan `is_reviewed = false`, agar tetap tersimpan dalam state "Nanti Saja"
 * dan warga dapat memberikan rating kapan saja di kemudian hari dari halaman Riwayat.
 */
export async function markReviewLater(
  id: string,
): Promise<ReviewLaterResult> {
  if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
    return fail(400, "INVALID_ID", "ID antrean tidak valid (harus UUID).");
  }

  const supabase = createServiceClient();

  const { data: ticket, error } = await supabase
    .from("queues")
    .select("id, queue_number, status, is_reviewed, user_id, nik, family_member_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal membaca data tiket: ${error.message}`);
  }

  if (!ticket) {
    return fail(404, "TICKET_NOT_FOUND", `Tiket dengan id "${id}" tidak ditemukan.`);
  }

  // Wajibkan login
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return fail(401, "UNAUTHORIZED", "Silakan login terlebih dahulu.");
  }

  // Validasi kepemilikan jika pengguna warga sedang login
  if (currentUser.role === "user") {
    let isOwner =
      ticket.user_id === currentUser.id ||
      (currentUser.nik && ticket.nik === currentUser.nik);

    if (!isOwner && ticket.family_member_id) {
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("id", ticket.family_member_id)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (familyMember) isOwner = true;
    }

    if (!isOwner) {
      return fail(403, "FORBIDDEN", "Anda tidak memiliki hak akses untuk tiket antrean ini.");
    }
  }

  if (ticket.status !== "completed") {
    return fail(
      422,
      "TICKET_NOT_COMPLETED",
      `Tiket masih berstatus "${ticket.status}". Hanya tiket yang telah selesai (completed) yang dapat ditunda ulasannya.`,
    );
  }

  if (ticket.is_reviewed === true) {
    return fail(
      422,
      "ALREADY_REVIEWED",
      "Tiket ini sudah memiliki ulasan dan tidak dapat ditandai untuk diulas nanti.",
    );
  }

  const { error: updateError } = await supabase
    .from("queues")
    .update({ is_reviewed: false })
    .eq("id", id);

  if (updateError) {
    throw new Error(`Gagal memperbarui status review tiket: ${updateError.message}`);
  }

  return {
    ok: true,
    message: "Tiket berhasil ditandai untuk diulas nanti.",
    ticket: {
      id: ticket.id,
      queue_number: ticket.queue_number,
      status: ticket.status,
      is_reviewed: false,
    },
  };
}

export const reviewLater = markReviewLater;
