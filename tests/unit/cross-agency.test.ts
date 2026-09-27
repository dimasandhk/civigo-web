import { describe, it, expect, vi } from "vitest";

const MOCK_RAW_SERVICES = [
  {
    id: 1,
    agency_id: 1,
    name: "Pembuatan KTP Baru",
    requirements: ["Fotokopi Kartu Keluarga", "Surat Pengantar RT/RW", "Akta Kelahiran"],
    output_documents: ["KTP-el Fisik", "KTP Asli"],
    estimated_time: 15,
    agency: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "16:00", operating_days: [1, 2, 3, 4, 5] },
  },
  {
    id: 2,
    agency_id: 1,
    name: "Penerbitan Kartu Keluarga",
    requirements: ["Buku Nikah", "Surat Pengantar RT/RW"],
    output_documents: ["Kartu Keluarga (KK)", "KK Asli"],
    estimated_time: 20,
    agency: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "16:00", operating_days: [1, 2, 3, 4, 5] },
  },
  {
    id: 4,
    agency_id: 3,
    name: "Pembuatan Paspor Baru",
    requirements: ["KTP Asli", "Kartu Keluarga (KK)", "Akta Kelahiran / Ijazah"],
    output_documents: ["Paspor RI"],
    estimated_time: 30,
    agency: { id: 3, name: "Kantor Imigrasi", open_time: "08:00", close_time: "16:00", operating_days: [1, 2, 3, 4, 5] },
  },
];

// Mock database service client agar tes unit 100% lokal, cepat, dan tanpa koneksi luar
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === "services" ? MOCK_RAW_SERVICES : [],
        error: null,
      }),
    })),
  })),
}));

import {
  normalizeDocText,
  doesDocumentMatch,
  evaluatePrerequisites,
} from "@/lib/queue/cross-agency";

describe("Cross-Agency Document Engine (Unit Tests)", () => {
  describe("Text Normalization & Matching Rules", () => {
    it("normalizes punctuation and lowercase characters", () => {
      expect(normalizeDocText("  KTP-el / Fisik (Asli)! ")).toBe("ktp el / fisik asli");
    });

    it("matches exact and substring document requirements", () => {
      expect(doesDocumentMatch("KTP Asli", "KTP Asli")).toBe(true);
      expect(doesDocumentMatch("Fotokopi Kartu Keluarga", "Kartu Keluarga")).toBe(true);
    });

    it("handles slash-separated alternative requirements", () => {
      expect(doesDocumentMatch("Akta Kelahiran / Ijazah", "Akta Kelahiran")).toBe(true);
      expect(doesDocumentMatch("Akta Kelahiran / Ijazah", "Ijazah")).toBe(true);
      expect(doesDocumentMatch("Akta Kelahiran / Ijazah", "SIM")).toBe(false);
    });

    it("identifies semantic tags across variations", () => {
      expect(doesDocumentMatch("Identitas Kependudukan Digital (IKD)", "KTP")).toBe(true);
      expect(doesDocumentMatch("KK Asli", "Kartu Keluarga")).toBe(true);
    });
  });

  describe("3-State Document Conditions Evaluation", () => {
    it("returns is_ready_to_book = true when all documents are 'sudah_tersedia'", async () => {
      const result = await evaluatePrerequisites(4, [
        { name: "KTP Asli", status: "sudah_tersedia" },
        { name: "Kartu Keluarga", status: "tersedia" },
        { name: "Akta Kelahiran", status: "sudah_tersedia" },
      ]);

      expect(result.is_ready_to_book).toBe(true);
      expect(result.missing_count).toBe(0);
      expect(result.fulfilled_count).toBe(3);
      expect(result.suggested_flow.length).toBe(1);
      expect(result.suggested_flow[0].type).toBe("target");
    });

    it("identifies cross-agency recommended services for 'belum_memiliki' documents", async () => {
      const result = await evaluatePrerequisites(4, [
        { name: "KTP Asli", status: "sudah_tersedia" },
        { name: "Akta Kelahiran", status: "sudah_tersedia" },
        { name: "Kartu Keluarga", status: "belum_memiliki" },
      ]);

      expect(result.is_ready_to_book).toBe(false);
      expect(result.missing_count).toBe(1);

      const missingKK = result.missing_documents.find((d) => d.requirement.includes("Kartu Keluarga"));
      expect(missingKK).toBeDefined();
      expect(missingKK?.type).toBe("cross_agency");
      expect(missingKK?.is_cross_agency).toBe(true);
      expect(missingKK?.recommended_service?.name).toBe("Penerbitan Kartu Keluarga");
      expect(missingKK?.recommended_service?.agency_name).toBe("Disdukcapil");
    });

    it("handles 'hilang_rusak' documents by requiring police report (SKTLK) and prepending flow step", async () => {
      const result = await evaluatePrerequisites(4, [
        { name: "KTP Asli", status: "hilang_rusak" },
        { name: "Kartu Keluarga", status: "sudah_tersedia" },
        { name: "Akta Kelahiran", status: "sudah_tersedia" },
      ]);

      expect(result.is_ready_to_book).toBe(false);
      expect(result.missing_count).toBe(1);

      const lostKtp = result.missing_documents.find((d) => d.requirement.includes("KTP"));
      expect(lostKtp).toBeDefined();
      expect(lostKtp?.condition).toBe("hilang_rusak");
      expect(lostKtp?.requires_police_report).toBe(true);
      expect(lostKtp?.guidance).toContain("HILANG/RUSAK");
      expect(lostKtp?.guidance).toContain("SKTLK");

      // Verifikasi flow step pertama adalah pembuatan SKTLK di Kepolisian
      expect(result.suggested_flow.length).toBeGreaterThanOrEqual(2);
      expect(result.suggested_flow[0].type).toBe("external");
      expect(result.suggested_flow[0].title).toContain("Kepolisian (SKTLK)");
      expect(result.summary).toContain("HILANG/RUSAK");
    });

    it("supports backward compatibility with string[] inputs", async () => {
      const result = await evaluatePrerequisites(4, ["KTP Asli", "Kartu Keluarga (KK)", "Akta Kelahiran"]);
      expect(result.is_ready_to_book).toBe(true);
      expect(result.fulfilled_count).toBe(3);
    });
  });
});
