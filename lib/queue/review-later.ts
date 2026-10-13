import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, isUuid, type Failure } from "./shared";

export type ReviewLaterSuccess = {
  ok: true;
  message: string;
  ticket: {
    id: string;
    queue_number: string;
    status: string;
    is_reviewed: boolean;
  };
};

export type ReviewLaterResult = ReviewLaterSuccess | Failure;

/**
 * Menandai tiket yang telah selesai (status 'completed') dengan is_reviewed = false.
 * Digunakan saat pengguna menekan tombol "Nanti Saja" (Later) pada kartu ulasan di mobile.
 * Tiket akan tetap berada di active_tickets sebagai reminder sampai pengguna membuat ulasan.
 */
export async function markReviewLater(id: string): Promise<ReviewLaterResult> {
  if (!id || !isUuid(id)) {
    return fail(400, "INVALID_ID", "ID tiket tidak valid. Format harus UUID.");
  }

  const supabase = createServiceClient();
  const { data: ticket, error } = await supabase
    .from("queues")
    .select("id, queue_number, status, is_reviewed, user_id, nik")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal membaca data tiket: ${error.message}`);
  }

  if (!ticket) {
    return fail(404, "TICKET_NOT_FOUND", `Tiket dengan id "${id}" tidak ditemukan.`);
  }

  // Validasi kepemilikan jika pengguna warga sedang login
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.role === "user") {
    const isOwner =
      ticket.user_id === currentUser.id ||
      (currentUser.nik && ticket.nik === currentUser.nik);

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
    throw new Error(`Gagal memperbarui status is_reviewed: ${updateError.message}`);
  }

  return {
    ok: true,
    message: "Ulasan berhasil ditunda. Tiket tetap aktif sebagai pengingat ulasan.",
    ticket: {
      id: ticket.id,
      queue_number: ticket.queue_number,
      status: ticket.status,
      is_reviewed: false,
    },
  };
}
