"use server";

import { revalidatePath } from "next/cache";
import { resolveAgencyId, type ServiceDocumentItem } from "@/lib/data/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Aksi CRUD layanan untuk `/admin/layanan`.
 *
 * `resolveAgencyId()` memanggil `requireOfficer()`, dan setiap tulisan dibatasi
 * `agency_id` petugas: service_role melewati RLS, jadi tanpa filter itu petugas
 * bisa mengubah layanan instansi lain cukup dengan menebak id.
 *
 * `resolveAgencyId()` sengaja dipanggil di luar `try`: `redirect()` di
 * `requireOfficer()` bekerja dengan melempar error, dan kalau tertangkap di sini
 * petugas yang sesinya habis hanya melihat pesan "NEXT_REDIRECT".
 */

export type ActionResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export type ServiceInput = {
  name: string;
  estimatedTime: number | null;
  infoProcedure: string;
  requirementDocIds: number[];
  outputDocIds: number[];
};

const NAME_MAX = 150;
const INFO_MAX = 2000;
const ESTIMATE_MAX = 480;
const DOC_NAME_MAX = 150;
const DOC_DESCRIPTION_MAX = 500;

type ServiceRow = {
  name: string;
  estimated_time: number | null;
  info_procedure: string | null;
  requirements: string[];
  requirement_doc_ids: number[];
  output_documents: string[];
  output_doc_ids: number[];
};

function uniqueIds(ids: unknown): number[] | null {
  if (!Array.isArray(ids)) return null;
  if (!ids.every((id) => Number.isInteger(id) && id > 0)) return null;
  return [...new Set(ids as number[])];
}

/**
 * Validasi input sekaligus menerjemahkan id dokumen ke namanya.
 *
 * `services` menyimpan dua salinan: id (`requirement_doc_ids`/`output_doc_ids`)
 * dan nama teks (`requirements`/`output_documents`) yang dibaca API mobile.
 * Nama selalu diambil ulang dari `service_documents` di sini, tidak pernah dari
 * client, supaya kedua salinan tidak bisa berselisih.
 */
async function toServiceRow(
  input: ServiceInput,
): Promise<{ row: ServiceRow } | { error: string }> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Nama layanan wajib diisi." };
  if (name.length > NAME_MAX) {
    return { error: `Nama layanan maksimal ${NAME_MAX} karakter.` };
  }

  const estimate = input.estimatedTime;
  if (
    estimate !== null &&
    (!Number.isInteger(estimate) || estimate < 1 || estimate > ESTIMATE_MAX)
  ) {
    return { error: `Estimasi waktu harus bilangan bulat 1–${ESTIMATE_MAX} menit.` };
  }

  const info = typeof input.infoProcedure === "string" ? input.infoProcedure.trim() : "";
  if (info.length > INFO_MAX) {
    return { error: `Info prosedur maksimal ${INFO_MAX} karakter.` };
  }

  const requirementIds = uniqueIds(input.requirementDocIds);
  const outputIds = uniqueIds(input.outputDocIds);
  if (!requirementIds || !outputIds) return { error: "Daftar dokumen tidak valid." };

  const allIds = [...new Set([...requirementIds, ...outputIds])];
  const names = new Map<number, string>();

  if (allIds.length > 0) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("service_documents")
      .select("id, name")
      .in("id", allIds);

    if (error) return { error: `Gagal memeriksa katalog dokumen: ${error.message}` };
    for (const doc of data ?? []) names.set(doc.id, doc.name);

    if (names.size !== allIds.length) {
      return { error: "Sebagian dokumen yang dipilih tidak ada di katalog. Muat ulang halaman." };
    }
  }

  return {
    row: {
      name,
      estimated_time: estimate,
      info_procedure: info || null,
      requirement_doc_ids: requirementIds,
      requirements: requirementIds.map((id) => names.get(id)!),
      output_doc_ids: outputIds,
      output_documents: outputIds.map((id) => names.get(id)!),
    },
  };
}

function revalidateServicePages() {
  revalidatePath("/admin/layanan");
  revalidatePath("/admin");
  revalidatePath("/admin/ulasan");
}

async function nameTaken(agencyId: number, name: string, exceptId?: number) {
  const supabase = createServiceClient();
  let query = supabase
    .from("services")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("name", name.replace(/[\\%_]/g, "\\$&"));

  if (exceptId !== undefined) query = query.neq("id", exceptId);

  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

export async function createServiceAction(input: ServiceInput): Promise<ActionResponse> {
  const agencyId = await resolveAgencyId();
  try {
    const parsed = await toServiceRow(input);
    if ("error" in parsed) return { ok: false, error: parsed.error };

    if (await nameTaken(agencyId, parsed.row.name)) {
      return { ok: false, error: `Layanan "${parsed.row.name}" sudah ada di instansi ini.` };
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("services")
      .insert({ ...parsed.row, agency_id: agencyId });

    if (error) return { ok: false, error: `Gagal menambahkan layanan: ${error.message}` };

    revalidateServicePages();
    return { ok: true, message: `Layanan "${parsed.row.name}" berhasil ditambahkan.` };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

export async function updateServiceAction(
  serviceId: number,
  input: ServiceInput,
): Promise<ActionResponse> {
  const agencyId = await resolveAgencyId();
  try {
    if (!Number.isInteger(serviceId)) return { ok: false, error: "Layanan tidak valid." };

    const parsed = await toServiceRow(input);
    if ("error" in parsed) return { ok: false, error: parsed.error };

    if (await nameTaken(agencyId, parsed.row.name, serviceId)) {
      return { ok: false, error: `Layanan "${parsed.row.name}" sudah ada di instansi ini.` };
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("services")
      .update(parsed.row)
      .eq("id", serviceId)
      .eq("agency_id", agencyId)
      .select("id");

    if (error) return { ok: false, error: `Gagal memperbarui layanan: ${error.message}` };
    if (!data || data.length === 0) {
      return { ok: false, error: "Layanan tidak ditemukan di instansi Anda." };
    }

    revalidateServicePages();
    return { ok: true, message: `Layanan "${parsed.row.name}" berhasil diperbarui.` };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

/**
 * Hapus layanan — hanya kalau belum pernah dipakai.
 *
 * `services` tidak punya kolom status, jadi layanan yang sudah dipakai tidak
 * bisa "dinonaktifkan" seperti loket. `queues.service_id` tidak punya ON DELETE
 * (hapus akan ditolak FK), dan `reviews.service_id` ON DELETE SET NULL (ulasan
 * kehilangan layanannya diam-diam). Keduanya dicek dulu dan penghapusan ditolak
 * dengan alasan yang jelas.
 */
export async function deleteServiceAction(serviceId: number): Promise<ActionResponse> {
  const agencyId = await resolveAgencyId();
  try {
    if (!Number.isInteger(serviceId)) return { ok: false, error: "Layanan tidak valid." };

    const supabase = createServiceClient();
    const { data: service, error: findError } = await supabase
      .from("services")
      .select("id, name")
      .eq("id", serviceId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (findError) return { ok: false, error: `Gagal memuat layanan: ${findError.message}` };
    if (!service) return { ok: false, error: "Layanan tidak ditemukan di instansi Anda." };

    const [queuesRes, reviewsRes] = await Promise.all([
      supabase
        .from("queues")
        .select("id", { count: "exact", head: true })
        .eq("service_id", serviceId),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("service_id", serviceId),
    ]);

    if (queuesRes.error || reviewsRes.error) {
      const message = (queuesRes.error ?? reviewsRes.error)!.message;
      return { ok: false, error: `Gagal memeriksa riwayat layanan: ${message}` };
    }

    const queueCount = queuesRes.count ?? 0;
    const reviewCount = reviewsRes.count ?? 0;

    if (queueCount > 0 || reviewCount > 0) {
      const usage = [
        queueCount > 0 ? `${queueCount} antrean` : null,
        reviewCount > 0 ? `${reviewCount} ulasan` : null,
      ]
        .filter(Boolean)
        .join(" dan ");

      return {
        ok: false,
        error: `Layanan "${service.name}" tidak dapat dihapus karena sudah memiliki riwayat ${usage}. Riwayat tersebut dipertahankan untuk laporan.`,
      };
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("agency_id", agencyId);

    if (error) return { ok: false, error: `Gagal menghapus layanan: ${error.message}` };

    revalidateServicePages();
    return { ok: true, message: `Layanan "${service.name}" berhasil dihapus.` };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}

export type CreateDocumentResponse = ActionResponse & { document?: ServiceDocumentItem };

/**
 * Tambah dokumen ke master `service_documents` dari pemilih dokumen.
 *
 * Nama dokumen unik secara global (constraint `service_documents_name_key`).
 * Kalau nama yang sama (tanpa beda huruf besar/kecil) sudah ada, dokumen itu
 * yang dikembalikan untuk dipilih, bukan dibuat duplikatnya.
 */
export async function createServiceDocumentAction(
  name: string,
  description: string,
): Promise<CreateDocumentResponse> {
  const agencyId = await resolveAgencyId();
  try {
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (!trimmedName) return { ok: false, error: "Nama dokumen wajib diisi." };
    if (trimmedName.length > DOC_NAME_MAX) {
      return { ok: false, error: `Nama dokumen maksimal ${DOC_NAME_MAX} karakter.` };
    }
    if (trimmedDescription.length > DOC_DESCRIPTION_MAX) {
      return { ok: false, error: `Deskripsi dokumen maksimal ${DOC_DESCRIPTION_MAX} karakter.` };
    }

    const supabase = createServiceClient();
    const { data: existing, error: findError } = await supabase
      .from("service_documents")
      .select("id, name, description, agency_id")
      .ilike("name", trimmedName.replace(/[\\%_]/g, "\\$&"))
      .limit(1)
      .maybeSingle();

    if (findError) return { ok: false, error: `Gagal memeriksa katalog dokumen: ${findError.message}` };
    if (existing) {
      return {
        ok: true,
        document: existing,
        message: `Dokumen "${existing.name}" sudah ada di katalog dan langsung dipilih.`,
      };
    }

    const { data: created, error } = await supabase
      .from("service_documents")
      .insert({
        name: trimmedName,
        description: trimmedDescription || null,
        agency_id: agencyId,
      })
      .select("id, name, description, agency_id")
      .single();

    if (error) return { ok: false, error: `Gagal menambahkan dokumen: ${error.message}` };

    revalidatePath("/admin/layanan");
    return {
      ok: true,
      document: created,
      message: `Dokumen "${created.name}" ditambahkan ke katalog.`,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Terjadi kesalahan internal." };
  }
}
