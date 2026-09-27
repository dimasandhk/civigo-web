"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { resolveAgencyId } from "@/lib/data/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server Actions untuk halaman `/admin/loket`.
 *
 * Setiap export di file `"use server"` adalah endpoint POST yang bisa dipanggil
 * siapa saja yang login, tanpa lewat UI. Karena itu `counterId` dari client
 * tidak pernah dipercaya begitu saja: loketnya dicari dulu di dalam cakupan
 * petugas (instansi + lokasi cabang dari profilnya), sama persis dengan yang
 * ditampilkan halamannya. Sebelumnya petugas Disdukcapil bisa mengubah atau
 * menghapus loket Samsat cukup dengan mengirim id-nya.
 */

export type ActionResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

type CounterScope = {
  agencyId: number;
  /** `null` berarti akun tidak terikat cabang — halaman pun menampilkan semua loket instansinya. */
  locationId: number | null;
};

const NOT_FOUND = "Loket tidak ditemukan di instansi atau cabang Anda.";

/** Cakupan yang sama dengan `resolveAgencyContext()` di halaman loket. */
async function resolveCounterScope(): Promise<CounterScope> {
  const profile = await requireOfficer();
  const agencyId = profile.agency_id ?? (await resolveAgencyId());

  return { agencyId, locationId: profile.location_id };
}

function isValidCounterId(counterId: unknown): counterId is number {
  return typeof counterId === "number" && Number.isInteger(counterId) && counterId > 0;
}

/** Loket milik cakupan petugas, atau `null` kalau id-nya milik instansi/cabang lain. */
async function findScopedCounter(counterId: number, scope: CounterScope) {
  const supabase = createServiceClient();

  let query = supabase
    .from("counters")
    .select("id, counter_name, status")
    .eq("id", counterId)
    .eq("agency_id", scope.agencyId);

  if (scope.locationId !== null) {
    query = query.eq("location_id", scope.locationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`Gagal memeriksa loket: ${error.message}`);

  return data;
}

function revalidateCounterPages() {
  revalidatePath("/admin/loket");
  revalidatePath("/admin");
  revalidatePath("/admin/antrean");
}

function failure(err: unknown): ActionResponse {
  // `requireOfficer()` me-redirect sesi yang habis. Tanpa ini redirect-nya ikut
  // tertangkap dan petugas hanya melihat pesan "NEXT_REDIRECT".
  unstable_rethrow(err);

  return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
}

export async function toggleCounterStatusAction(
  counterId: number,
  currentStatus: "aktif" | "nonaktif",
): Promise<ActionResponse> {
  try {
    const scope = await resolveCounterScope();

    if (!isValidCounterId(counterId)) return { ok: false, error: "Loket tidak valid." };
    if (currentStatus !== "aktif" && currentStatus !== "nonaktif") {
      return { ok: false, error: "Status loket tidak valid." };
    }

    const counter = await findScopedCounter(counterId, scope);
    if (!counter) return { ok: false, error: NOT_FOUND };

    const newStatus = currentStatus === "aktif" ? "inactive" : "active";

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("counters")
      .update({ status: newStatus })
      .eq("id", counter.id)
      .eq("agency_id", scope.agencyId);

    if (error) {
      return { ok: false, error: `Gagal memperbarui status loket: ${error.message}` };
    }

    revalidateCounterPages();

    return {
      ok: true,
      message: `Status loket berhasil diubah menjadi ${newStatus === "active" ? "Aktif" : "Nonaktif"}.`,
    };
  } catch (err) {
    return failure(err);
  }
}

export async function createCounterAction(name: string): Promise<ActionResponse> {
  try {
    const scope = await resolveCounterScope();
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return { ok: false, error: "Nama loket wajib diisi." };
    }

    // Loket selalu berada di satu cabang. Dulu akun tanpa `location_id` diam-diam
    // menaruh loketnya di lokasi 1, cabang yang belum tentu miliknya.
    if (scope.locationId === null) {
      return {
        ok: false,
        error:
          "Akun Anda belum terhubung ke lokasi cabang, jadi loket baru tidak bisa ditempatkan. Minta admin mengisi lokasi cabang akun Anda.",
      };
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("counters").insert({
      counter_name: trimmedName,
      agency_id: scope.agencyId,
      location_id: scope.locationId,
      status: "active",
    });

    if (error) {
      return { ok: false, error: `Gagal menambahkan loket: ${error.message}` };
    }

    revalidateCounterPages();

    return { ok: true, message: `Loket "${trimmedName}" berhasil ditambahkan.` };
  } catch (err) {
    return failure(err);
  }
}

export async function updateCounterNameAction(
  counterId: number,
  name: string,
): Promise<ActionResponse> {
  try {
    const scope = await resolveCounterScope();
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!isValidCounterId(counterId)) return { ok: false, error: "Loket tidak valid." };
    if (!trimmedName) {
      return { ok: false, error: "Nama loket tidak boleh kosong." };
    }

    const counter = await findScopedCounter(counterId, scope);
    if (!counter) return { ok: false, error: NOT_FOUND };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("counters")
      .update({ counter_name: trimmedName })
      .eq("id", counter.id)
      .eq("agency_id", scope.agencyId);

    if (error) {
      return { ok: false, error: `Gagal mengubah nama loket: ${error.message}` };
    }

    revalidateCounterPages();

    return { ok: true, message: `Nama loket berhasil diperbarui.` };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteCounterAction(counterId: number): Promise<ActionResponse> {
  try {
    const scope = await resolveCounterScope();

    if (!isValidCounterId(counterId)) return { ok: false, error: "Loket tidak valid." };

    const counter = await findScopedCounter(counterId, scope);
    if (!counter) return { ok: false, error: NOT_FOUND };

    const supabase = createServiceClient();

    // Check if counter has queues associated with it
    const { count, error: countError } = await supabase
      .from("queues")
      .select("id", { count: "exact", head: true })
      .eq("counter_id", counter.id);

    if (countError) {
      return { ok: false, error: `Gagal memeriksa riwayat antrean loket: ${countError.message}` };
    }

    if (count && count > 0) {
      // Deactivate instead of failing foreign key constraint
      const { error: updateError } = await supabase
        .from("counters")
        .update({ status: "inactive" })
        .eq("id", counter.id)
        .eq("agency_id", scope.agencyId);

      if (updateError) {
        return { ok: false, error: `Gagal menonaktifkan loket: ${updateError.message}` };
      }

      revalidateCounterPages();

      return {
        ok: true,
        message: `Loket memiliki riwayat antrean, sehingga statusnya otomatis diubah menjadi Nonaktif.`,
      };
    }

    const { error } = await supabase
      .from("counters")
      .delete()
      .eq("id", counter.id)
      .eq("agency_id", scope.agencyId);

    if (error) {
      return { ok: false, error: `Gagal menghapus loket: ${error.message}` };
    }

    revalidateCounterPages();

    return { ok: true, message: "Loket berhasil dihapus." };
  } catch (err) {
    return failure(err);
  }
}
