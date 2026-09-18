"use server";

import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import { resolveAgencyId } from "@/lib/data/admin";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function toggleCounterStatusAction(
  counterId: number,
  currentStatus: "aktif" | "nonaktif",
): Promise<ActionResponse> {
  try {
    await requireOfficer();
    const newStatus = currentStatus === "aktif" ? "inactive" : "active";

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("counters")
      .update({ status: newStatus })
      .eq("id", counterId);

    if (error) {
      return { ok: false, error: `Gagal memperbarui status loket: ${error.message}` };
    }

    revalidatePath("/admin/loket");
    revalidatePath("/admin");
    revalidatePath("/admin/antrean");

    return {
      ok: true,
      message: `Status loket berhasil diubah menjadi ${newStatus === "active" ? "Aktif" : "Nonaktif"}.`,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

export async function createCounterAction(name: string): Promise<ActionResponse> {
  try {
    const profile = await requireOfficer();
    const agencyId = profile.agency_id ?? (await resolveAgencyId());
    const locationId = profile.location_id ?? 1;
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { ok: false, error: "Nama loket wajib diisi." };
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("counters").insert({
      counter_name: trimmedName,
      agency_id: agencyId,
      location_id: locationId,
      status: "active",
    });

    if (error) {
      return { ok: false, error: `Gagal menambahkan loket: ${error.message}` };
    }

    revalidatePath("/admin/loket");
    revalidatePath("/admin");
    revalidatePath("/admin/antrean");

    return { ok: true, message: `Loket "${trimmedName}" berhasil ditambahkan.` };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

export async function updateCounterNameAction(
  counterId: number,
  name: string,
): Promise<ActionResponse> {
  try {
    await requireOfficer();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { ok: false, error: "Nama loket tidak boleh kosong." };
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("counters")
      .update({ counter_name: trimmedName })
      .eq("id", counterId);

    if (error) {
      return { ok: false, error: `Gagal mengubah nama loket: ${error.message}` };
    }

    revalidatePath("/admin/loket");
    revalidatePath("/admin");
    revalidatePath("/admin/antrean");

    return { ok: true, message: `Nama loket berhasil diperbarui.` };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

export async function deleteCounterAction(counterId: number): Promise<ActionResponse> {
  try {
    await requireOfficer();
    const supabase = createServiceClient();

    // Check if counter has queues associated with it
    const { count } = await supabase
      .from("queues")
      .select("id", { count: "exact", head: true })
      .eq("counter_id", counterId);

    if (count && count > 0) {
      // Deactivate instead of failing foreign key constraint
      const { error: updateError } = await supabase
        .from("counters")
        .update({ status: "inactive" })
        .eq("id", counterId);

      if (updateError) {
        return { ok: false, error: `Gagal menonaktifkan loket: ${updateError.message}` };
      }

      revalidatePath("/admin/loket");
      revalidatePath("/admin");
      revalidatePath("/admin/antrean");

      return {
        ok: true,
        message: `Loket memiliki riwayat antrean, sehingga statusnya otomatis diubah menjadi Nonaktif.`,
      };
    }

    const { error } = await supabase.from("counters").delete().eq("id", counterId);

    if (error) {
      return { ok: false, error: `Gagal menghapus loket: ${error.message}` };
    }

    revalidatePath("/admin/loket");
    revalidatePath("/admin");
    revalidatePath("/admin/antrean");

    return { ok: true, message: "Loket berhasil dihapus." };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}
