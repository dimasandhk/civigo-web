import { createServiceClient } from "@/lib/supabase/service";

/**
 * Pemetaan default dokumen output untuk tiap layanan di database CiviGo.
 * Digunakan sebagai fallback aman jika migrasi kolom `output_documents`
 * belum dieksekusi di database Supabase remote.
 */
export const DEFAULT_OUTPUT_DOCUMENTS: Record<number, string[]> = {
  1: ["KTP-el Fisik", "KTP Asli", "KTP"],
  2: ["Kartu Keluarga (KK)", "KK Asli", "KK"],
  3: ["STNK yang Disahkan (SKPD)", "STNK Asli", "STNK"],
  4: ["Paspor RI", "Paspor"],
  5: ["Identitas Kependudukan Digital (IKD)"],
  6: ["Surat Rekomendasi Adminduk"],
};

export type AgencySummary = {
  id: number;
  name: string;
  open_time?: string;
  close_time?: string;
  operating_days?: number[];
};

export type ServiceSummary = {
  id: number;
  agency_id: number;
  name: string;
  requirements: string[];
  output_documents: string[];
  estimated_time: number | null;
  agency: AgencySummary;
};

export type MissingDocumentType = "cross_agency" | "external" | "general_prerequisite";

export type DocumentState = "tersedia" | "belum_memiliki" | "hilang_rusak";

export type DocumentConditionInput = {
  name: string;
  status?: DocumentState | string;
};

export type RecommendedService = {
  id: number;
  name: string;
  agency_id: number;
  agency_name: string;
  estimated_time: number | null;
  output_document: string;
};

export type MissingDocumentDetail = {
  requirement: string;
  type: MissingDocumentType;
  is_cross_agency: boolean;
  recommended_service: RecommendedService | null;
  external_issuer?: string;
  guidance: string;
  condition?: DocumentState;
  requires_police_report?: boolean;
};

export type FulfilledDocumentDetail = {
  requirement: string;
  matched_with: string;
};

export type FlowStep = {
  step: number;
  type: "agency" | "external" | "target";
  agency_id?: number;
  title: string;
  description: string;
  services?: {
    id: number;
    name: string;
    produces: string;
  }[];
};

export type PrerequisiteEvaluation = {
  target_service: ServiceSummary;
  is_ready_to_book: boolean;
  summary: string;
  total_requirements: number;
  fulfilled_count: number;
  missing_count: number;
  fulfilled_documents: FulfilledDocumentDetail[];
  missing_documents: MissingDocumentDetail[];
  suggested_flow: FlowStep[];
};

/** Normalisasi string dokumen untuk perbandingan */
export function normalizeDocText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ekstraksi tag dokumen umum untuk semantic matching (KTP, KK, STNK, Paspor, dll.)
 */
function extractDocTags(text: string): Set<string> {
  const norm = normalizeDocText(text);
  const tags = new Set<string>();

  if (norm.includes("ktp") || norm.includes("identitas kependudukan digital") || norm.includes("ikd")) {
    tags.add("ktp");
  }
  if (norm.includes("kartu keluarga") || /\bkk\b/.test(norm)) {
    tags.add("kk");
  }
  if (norm.includes("stnk")) {
    tags.add("stnk");
  }
  if (norm.includes("paspor")) {
    tags.add("paspor");
  }
  if (norm.includes("bpkb")) {
    tags.add("bpkb");
  }
  if (norm.includes("akta") || norm.includes("lahir")) {
    tags.add("akta");
  }
  if (norm.includes("ijazah")) {
    tags.add("ijazah");
  }
  if (norm.includes("nikah") || norm.includes("kawin")) {
    tags.add("nikah");
  }
  if (norm.includes("rt") || norm.includes("rw") || norm.includes("pengantar")) {
    tags.add("rt_rw");
  }

  return tags;
}

/**
 * Cek apakah sebuah candidate document (misal dokumen yang dimiliki user atau output layanan)
 * memenuhi sebuah requirement dokumen.
 */
export function doesDocumentMatch(requirement: string, candidate: string): boolean {
  const reqNorm = normalizeDocText(requirement);
  const candNorm = normalizeDocText(candidate);

  // 1. Exact match
  if (reqNorm === candNorm) return true;

  // 2. Substring match
  if (reqNorm.includes(candNorm) || candNorm.includes(reqNorm)) return true;

  // 3. Alternative requirement: jika dipisah garis miring ("Akta Kelahiran / Ijazah")
  if (requirement.includes("/")) {
    const parts = requirement.split("/").map((p) => p.trim());
    if (parts.some((part) => doesDocumentMatch(part, candidate))) {
      return true;
    }
  }

  // 4. Semantic tag match
  const reqTags = extractDocTags(requirement);
  const candTags = extractDocTags(candidate);

  for (const tag of reqTags) {
    if (candTags.has(tag)) return true;
  }

  return false;
}

/**
 * Ambil panduan pihak eksternal untuk dokumen yang tidak dihasilkan oleh layanan CiviGo.
 */
function getExternalDocumentGuidance(requirement: string): {
  isExternal: boolean;
  issuer?: string;
  guidance: string;
} {
  const norm = normalizeDocText(requirement);

  if (norm.includes("rt") || norm.includes("rw") || norm.includes("pengantar")) {
    return {
      isExternal: true,
      issuer: "Pengurus RT & RW Setempat",
      guidance: "Mintalah Surat Pengantar resmi ke Ketua RT dan RW di wilayah domisili Anda sebelum mendatangi kantor pelayanan.",
    };
  }

  if (norm.includes("nikah") || norm.includes("kawin")) {
    return {
      isExternal: true,
      issuer: "KUA (Kementerian Agama) / Dinas Kependudukan dan Catatan Sipil",
      guidance: "Bawa Buku Nikah asli atau Kutipan Akta Perkawinan resmi yang diterbitkan KUA atau Dinas Catatan Sipil.",
    };
  }

  if (norm.includes("bpkb")) {
    return {
      isExternal: true,
      issuer: "Ditlantas POLRI / Lembaga Pembiayaan (Leasing)",
      guidance: "Bawa Buku Pemilik Kendaraan Bermotor (BPKB) asli. Jika kendaraan masih dalam masa kredit/leasing, mintalah surat keterangan dan fotokopi BPKB legalisir dari pihak leasing.",
    };
  }

  if (norm.includes("akta") || norm.includes("ijazah")) {
    return {
      isExternal: true,
      issuer: "Dinas Kependudukan & Pencatatan Sipil / Instansi Pendidikan",
      guidance: "Bawa Kutipan Akta Kelahiran asli atau Ijazah pendidikan terakhir yang tertera nama dan identitas Anda secara jelas.",
    };
  }

  // Syarat umum non-dokumen fisik (misal: "Berusia 17 Tahun", "Smartphone dengan koneksi internet", dll.)
  return {
    isExternal: false,
    guidance: `Pastikan Anda telah memenuhi ketentuan "${requirement}" sebelum hadir ke loket pelayanan.`,
  };
}

type RawServiceRow = {
  id: number;
  name: string;
  requirements: unknown;
  output_documents?: string[] | null;
  estimated_time?: number | null;
  agency_id?: number | null;
  agency?: {
    id?: number;
    name?: string;
    open_time?: string;
    close_time?: string;
    operating_days?: number[];
  } | null;
};

/**
 * Ambil seluruh katalog layanan dari database dengan fallback aman untuk kolom output_documents.
 */
export async function getAllServices(): Promise<ServiceSummary[]> {
  const supabase = createServiceClient();

  // Coba query kolom lengkap termasuk output_documents
  let servicesRaw: RawServiceRow[] = [];
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      requirements,
      output_documents,
      estimated_time,
      agency_id,
      agency:agencies(id, name, open_time, close_time, operating_days)
    `)
    .order("id", { ascending: true });

  if (error) {
    // Jika kolom output_documents belum ada (Postgres code 42703), query kolom standar
    const fallbackQuery = await supabase
      .from("services")
      .select(`
        id,
        name,
        requirements,
        estimated_time,
        agency_id,
        agency:agencies(id, name, open_time, close_time, operating_days)
      `)
      .order("id", { ascending: true });

    if (fallbackQuery.error) {
      throw new Error(`Gagal memuat katalog layanan: ${fallbackQuery.error.message}`);
    }
    servicesRaw = (fallbackQuery.data as unknown as RawServiceRow[]) ?? [];
  } else {
    servicesRaw = (data as unknown as RawServiceRow[]) ?? [];
  }

  return servicesRaw.map((s) => {
    const serviceId = Number(s.id);
    const rawReq = s.requirements;
    const requirements: string[] = Array.isArray(rawReq)
      ? rawReq.map(String)
      : typeof rawReq === "string"
      ? [rawReq]
      : [];

    const dbOutputs: string[] = Array.isArray(s.output_documents) && s.output_documents.length > 0
      ? s.output_documents.map(String)
      : (DEFAULT_OUTPUT_DOCUMENTS[serviceId] ?? []);

    const agencyData = s.agency;

    return {
      id: serviceId,
      agency_id: s.agency_id ?? 1,
      name: s.name,
      requirements,
      output_documents: dbOutputs,
      estimated_time: s.estimated_time ?? null,
      agency: {
        id: agencyData?.id ?? s.agency_id ?? 1,
        name: agencyData?.name ?? "Instansi Pemerintah",
        open_time: agencyData?.open_time ?? "08:00",
        close_time: agencyData?.close_time ?? "16:00",
        operating_days: agencyData?.operating_days ?? [1, 2, 3, 4, 5],
      },
    };
  });
}

/**
 * Cari satu layanan berdasarkan ID.
 */
export async function getServiceById(serviceId: number): Promise<ServiceSummary | null> {
  const all = await getAllServices();
  return all.find((s) => s.id === serviceId) ?? null;
}

function parseDocumentInput(input: string | DocumentConditionInput): { name: string; state: DocumentState } {
  if (typeof input === "string") {
    return { name: input.trim(), state: "tersedia" };
  }
  const name = String(input.name || "").trim();
  const rawState = String(input.status || "tersedia").toLowerCase().trim();

  let state: DocumentState = "tersedia";
  if (
    rawState.includes("rusak") ||
    rawState.includes("hilang") ||
    rawState.includes("lost") ||
    rawState.includes("damaged")
  ) {
    state = "hilang_rusak";
  } else if (
    rawState.includes("belum") ||
    rawState.includes("tidak") ||
    rawState.includes("missing")
  ) {
    state = "belum_memiliki";
  } else {
    state = "tersedia";
  }

  return { name, state };
}

/**
 * Algoritma Inti Dev 2 Tugas 2: Evaluasi Prasyarat Dokumen Antar-Instansi (Cross-Agency Logic).
 * Mendukung 3 kondisi kelengkapan dokumen:
 * 1. sudah_tersedia / tersedia: dokumen sudah lengkap di tangan pemohon.
 * 2. belum_memiliki: dokumen belum pernah dibuat/belum dimiliki.
 * 3. hilang_rusak: dokumen pernah dimiliki tetapi hilang atau rusak fisik,
 *    sehingga membutuhkan Surat Kehilangan Kepolisian (SKTLK) atau bukti fisik rusak.
 *
 * @param targetServiceId ID layanan yang ingin didatangi pengguna
 * @param ownedOrConditions Daftar dokumen (string[] atau array { name, status })
 */
export async function evaluatePrerequisites(
  targetServiceId: number,
  ownedOrConditions: Array<string | DocumentConditionInput> = []
): Promise<PrerequisiteEvaluation> {
  const allServices = await getAllServices();
  const targetService = allServices.find((s) => s.id === targetServiceId);

  if (!targetService) {
    throw new Error(`Layanan dengan ID ${targetServiceId} tidak ditemukan.`);
  }

  const normalizedInputs = (ownedOrConditions ?? []).map(parseDocumentInput);

  const fulfilled: FulfilledDocumentDetail[] = [];
  const missing: MissingDocumentDetail[] = [];

  // Evaluasi setiap item persyaratan dari targetService
  for (const req of targetService.requirements) {
    // Cek apakah ada input dokumen yang cocok
    const matchedInput = normalizedInputs.find((item) => doesDocumentMatch(req, item.name));

    if (matchedInput && matchedInput.state === "tersedia") {
      fulfilled.push({
        requirement: req,
        matched_with: matchedInput.name,
      });
      continue;
    }

    const docCondition: DocumentState = matchedInput?.state === "hilang_rusak" ? "hilang_rusak" : "belum_memiliki";
    const isLostOrDamaged = docCondition === "hilang_rusak";

    // Cari apakah ada layanan di CiviGo yang menerbitkan dokumen ini
    let sourceService: ServiceSummary | null = null;
    let matchedOutputDoc = "";

    for (const s of allServices) {
      if (s.id === targetService.id) continue;

      const matchedOut = s.output_documents.find((out) => doesDocumentMatch(req, out));
      if (matchedOut) {
        sourceService = s;
        matchedOutputDoc = matchedOut;
        break;
      }
    }

    if (sourceService) {
      const isCrossAgency = sourceService.agency_id !== targetService.agency_id;
      const agencyName = sourceService.agency.name;

      let guidanceText = "";
      if (isLostOrDamaged) {
        guidanceText = `Persyaratan "${req}" berstatus HILANG/RUSAK. Diterbitkan oleh ${agencyName} melalui layanan "${sourceService.name}". Siapkan Surat Kehilangan Polsek (SKTLK) atau fisik dokumen lama sebelum mengurus penggantian di ${agencyName}.`;
      } else if (isCrossAgency) {
        guidanceText = `Persyaratan "${req}" diterbitkan oleh ${agencyName} melalui layanan "${sourceService.name}". Anda disarankan mendatangi ${agencyName} terlebih dahulu.`;
      } else {
        guidanceText = `Persyaratan "${req}" dapat diurus melalui layanan "${sourceService.name}" di ${agencyName}.`;
      }

      missing.push({
        requirement: req,
        type: "cross_agency",
        is_cross_agency: isCrossAgency,
        condition: docCondition,
        requires_police_report: isLostOrDamaged,
        recommended_service: {
          id: sourceService.id,
          name: sourceService.name,
          agency_id: sourceService.agency_id,
          agency_name: agencyName,
          estimated_time: sourceService.estimated_time,
          output_document: matchedOutputDoc,
        },
        guidance: guidanceText,
      });
    } else {
      // Tidak disediakan oleh layanan internal CiviGo: periksa panduan instansi eksternal
      const externalInfo = getExternalDocumentGuidance(req);

      let guidanceText = externalInfo.guidance;
      if (isLostOrDamaged) {
        guidanceText = `Persyaratan "${req}" berstatus HILANG/RUSAK. Bawa Surat Kehilangan dari Kepolisian (SKTLK) atau dokumen pendukung lain ke instansi penerbit (${externalInfo.issuer ?? "pihak terkait"}).`;
      }

      missing.push({
        requirement: req,
        type: externalInfo.isExternal ? "external" : "general_prerequisite",
        is_cross_agency: false,
        condition: docCondition,
        requires_police_report: isLostOrDamaged,
        recommended_service: null,
        external_issuer: externalInfo.issuer,
        guidance: guidanceText,
      });
    }
  }

  const isReady = missing.length === 0;

  // Susun roadmap urutan pelayanan (suggested_flow)
  const suggestedFlow: FlowStep[] = [];
  let stepCounter = 1;

  // 1. Jika ada dokumen hilang/rusak, tambahkan langkah surat kehilangan di awal
  const lostDamagedCount = missing.filter((m) => m.condition === "hilang_rusak").length;
  if (lostDamagedCount > 0) {
    suggestedFlow.push({
      step: stepCounter++,
      type: "external",
      title: "Lapor Kehilangan di Kepolisian (SKTLK) / Bukti Fisik Rusak",
      description: "Untuk dokumen yang berstatus hilang, buat Surat Tanda Penerimaan Laporan Kehilangan (SKTLK) di Polsek terdekat. Untuk dokumen rusak, siapkan sisa fisik dokumen lama.",
    });
  }

  // 2. Kelompokkan layanan rujukan CiviGo berdasarkan instansi
  const crossAgencySteps = new Map<number, { agencyName: string; services: { id: number; name: string; produces: string }[] }>();

  for (const m of missing) {
    if (m.type === "cross_agency" && m.recommended_service) {
      const aid = m.recommended_service.agency_id;
      if (!crossAgencySteps.has(aid)) {
        crossAgencySteps.set(aid, {
          agencyName: m.recommended_service.agency_name,
          services: [],
        });
      }
      const group = crossAgencySteps.get(aid)!;
      if (!group.services.some((s) => s.id === m.recommended_service!.id)) {
        group.services.push({
          id: m.recommended_service.id,
          name: m.recommended_service.name,
          produces: m.recommended_service.output_document,
        });
      }
    }
  }

  for (const [agencyId, group] of crossAgencySteps.entries()) {
    suggestedFlow.push({
      step: stepCounter++,
      type: "agency",
      agency_id: agencyId,
      title: `Kunjungi ${group.agencyName}`,
      description: `Lengkapi dokumen prasyarat sebelum menuju ke ${targetService.agency.name}.`,
      services: group.services,
    });
  }

  // 3. Jika ada dokumen eksternal yang belum terpenuhi
  const externalMissing = missing.filter((m) => m.type === "external" && m.condition !== "hilang_rusak");
  if (externalMissing.length > 0) {
    suggestedFlow.push({
      step: stepCounter++,
      type: "external",
      title: "Persiapkan Dokumen Eksternal",
      description: externalMissing.map((m) => `${m.requirement} (${m.external_issuer ?? "Pihak Terkait"})`).join(", "),
    });
  }

  // 4. Langkah akhir: Layanan Target
  suggestedFlow.push({
    step: stepCounter++,
    type: "target",
    agency_id: targetService.agency_id,
    title: `Kunjungi ${targetService.agency.name} (Layanan Tujuan)`,
    description: isReady
      ? `Seluruh prasyarat terpenuhi. Silakan ambil nomor antrean untuk layanan "${targetService.name}".`
      : `Setelah melengkapi prasyarat di langkah sebelumnya, Anda siap mengajukan antrean "${targetService.name}".`,
    services: [
      {
        id: targetService.id,
        name: targetService.name,
        produces: targetService.output_documents[0] ?? targetService.name,
      },
    ],
  });

  // Susun kesimpulan manusiawi
  let summary = "";
  if (isReady) {
    summary = `Seluruh dokumen prasyarat terpenuhi. Anda siap melakukan reservasi antrean untuk ${targetService.name}.`;
  } else {
    const crossList = missing
      .filter((m) => m.type === "cross_agency")
      .map((m) => m.recommended_service?.agency_name)
      .filter(Boolean);
    const uniqueAgencies = Array.from(new Set(crossList));

    if (lostDamagedCount > 0) {
      summary = `Terdapat ${lostDamagedCount} dokumen berstatus HILANG/RUSAK dan ${missing.length - lostDamagedCount} belum dimiliki. Harap urus SKTLK di Polsek atau penggantian di ${uniqueAgencies.length > 0 ? uniqueAgencies.join(", ") : "instansi terkait"} sebelum mendatangi ${targetService.agency.name}.`;
    } else if (uniqueAgencies.length > 0) {
      summary = `Terdapat ${missing.length} prasyarat yang belum terpenuhi. Harap lengkapi dokumen di ${uniqueAgencies.join(", ")} terlebih dahulu sebelum mengajukan antrean ${targetService.name} di ${targetService.agency.name}.`;
    } else {
      summary = `Terdapat ${missing.length} prasyarat yang belum terpenuhi. Harap lengkapi dokumen persyaratan fisik sebelum datang ke loket.`;
    }
  }

  return {
    target_service: targetService,
    is_ready_to_book: isReady,
    summary,
    total_requirements: targetService.requirements.length,
    fulfilled_count: fulfilled.length,
    missing_count: missing.length,
    fulfilled_documents: fulfilled,
    missing_documents: missing,
    suggested_flow: suggestedFlow,
  };
}

export type ConciseRequirement = {
  name: string;
  agency_id: number | null;
  type: "dokumen" | "kondisi";
};

export type ServiceRequirementsSummary = {
  service_id: number;
  service_name: string;
  agency_id: number | null;
  requirements: ConciseRequirement[];
};

/**
 * Mengambil daftar prasyarat layanan dalam bentuk ringkas:
 * - name: nama dokumen / kondisi
 * - agency_id: ID instansi penerbit/penyelenggara
 * - type: 'dokumen' (berkas fisik/digital) atau 'kondisi' (kriteria non-dokumen)
 */
export async function getServiceRequirements(
  serviceId: number
): Promise<ServiceRequirementsSummary | null> {
  const supabase = createServiceClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, name, agency_id, requirements, requirement_doc_ids")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service) return null;

  const docIds = service.requirement_doc_ids ?? [];
  const reqStrings: string[] = Array.isArray(service.requirements)
    ? (service.requirements as string[])
    : [];

  let docs: Array<{ id: number; name: string; agency_id: number | null; type: string }> = [];

  if (docIds.length > 0) {
    const { data: matched } = await supabase
      .from("service_documents")
      .select("id, name, agency_id, type")
      .in("id", docIds);
    docs = (matched ?? []) as Array<{ id: number; name: string; agency_id: number | null; type: string }>;
  }

  if (docs.length === 0 && reqStrings.length > 0) {
    const { data: matchedByName } = await supabase
      .from("service_documents")
      .select("id, name, agency_id, type")
      .in("name", reqStrings);
    docs = (matchedByName ?? []) as Array<{ id: number; name: string; agency_id: number | null; type: string }>;
  }

  const docMapById = new Map(docs.map((d) => [d.id, d]));
  const docMapByName = new Map(docs.map((d) => [d.name.toLowerCase().trim(), d]));

  let formatted: ConciseRequirement[] = [];

  if (docIds.length > 0) {
    formatted = docIds.map((id) => {
      const d = docMapById.get(id);
      return {
        name: d?.name ?? `Dokumen #${id}`,
        agency_id: d?.agency_id ?? service.agency_id,
        type: (d?.type === "kondisi" ? "kondisi" : "dokumen") as "dokumen" | "kondisi",
      };
    });
  } else {
    formatted = reqStrings.map((req) => {
      const found = docMapByName.get(req.toLowerCase().trim());
      const isCondition =
        found?.type === "kondisi" ||
        /usia|umur|tahun|smartphone|koneksi|internet|email|sehat|wajib/i.test(req);

      return {
        name: found?.name ?? req,
        agency_id: found?.agency_id ?? service.agency_id,
        type: (isCondition ? "kondisi" : "dokumen") as "dokumen" | "kondisi",
      };
    });
  }

  return {
    service_id: service.id,
    service_name: service.name,
    agency_id: service.agency_id,
    requirements: formatted,
  };
}
