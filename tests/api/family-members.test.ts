import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET as getFamilyMembers, POST as createFamilyMember } from "@/app/api/family-members/route";
import { DELETE as deleteFamilyMember } from "@/app/api/family-members/[id]/route";

describe("Family Members Endpoints (API Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/family-members", () => {
    it("returns 401 if unauthenticated and no user_id query provided", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const req = new NextRequest("http://localhost:3000/api/family-members");
      const res = await getFamilyMembers(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns family members list when authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      const mockData = [
        { id: 1, user_id: "user-uuid-1", full_name: "Siti Rahma", nik: "3578012345670001", relationship: "Istri" },
      ];

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({ data: mockData, error: null }),
      });

      const req = new NextRequest("http://localhost:3000/api/family-members");
      const res = await getFamilyMembers(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.count).toBe(1);
      expect(json.family_members[0].full_name).toBe("Siti Rahma");
    });
  });

  describe("POST /api/family-members", () => {
    it("returns 400 if NIK is not 16 digits", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/family-members", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "12345", // Bukan 16 digit
          relationship: "Anak",
        }),
      });

      const res = await createFamilyMember(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_NIK");
    });

    it("returns 400 if full_name is too short", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/family-members", {
        method: "POST",
        body: JSON.stringify({
          full_name: "A",
          nik: "3578012345670002",
          relationship: "Anak",
        }),
      });

      const res = await createFamilyMember(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_NAME");
    });

    it("creates family member successfully when valid", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      const insertedRow = {
        id: 2,
        user_id: "user-uuid-1",
        full_name: "Budi Santoso",
        nik: "3578012345670002",
        relationship: "Anak Kandung",
      };

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: insertedRow, error: null }),
      });

      const req = new NextRequest("http://localhost:3000/api/family-members", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345670002",
          relationship: "Anak Kandung",
        }),
      });

      const res = await createFamilyMember(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.family_member.nik).toBe("3578012345670002");
    });
  });

  describe("DELETE /api/family-members/[id]", () => {
    it("returns 400 for invalid ID parameter", async () => {
      const req = new NextRequest("http://localhost:3000/api/family-members/invalid-id", {
        method: "DELETE",
      });

      const res = await deleteFamilyMember(req, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_ID");
    });

    it("returns 200 on successful deletion", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        // chained eq: .eq("id", id).eq("user_id", user_id)
        select: vi.fn().mockResolvedValueOnce({ data: [{ id: 2 }], error: null }),
      });

      const req = new NextRequest("http://localhost:3000/api/family-members/2", {
        method: "DELETE",
      });

      const res = await deleteFamilyMember(req, {
        params: Promise.resolve({ id: "2" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toContain("berhasil dihapus");
    });
    it("returns 401 if unauthenticated on delete", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/family-members/2", {
        method: "DELETE",
      });

      const res = await deleteFamilyMember(req, {
        params: Promise.resolve({ id: "2" }),
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 404 if family member not found or belongs to another user", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-1" } },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
      });

      const req = new NextRequest("http://localhost:3000/api/family-members/999", {
        method: "DELETE",
      });

      const res = await deleteFamilyMember(req, {
        params: Promise.resolve({ id: "999" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("MEMBER_NOT_FOUND");
    });
  });
});
