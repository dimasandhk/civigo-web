import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Gunakan vi.hoisted agar mock functions terdefinisi sebelum vi.mock di-hoist
const { mockResetPasswordForEmail, mockGetUser, mockUpdateUser } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  })),
}));

import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";

describe("Auth Endpoints (API Tests with Zero Email / API Key Consumption)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/forgot-password", () => {
    it("returns 400 if email is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await forgotPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("EMAIL_REQUIRED");
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("returns 400 if email format is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "bukan-email-valid" }),
      });

      const res = await forgotPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_EMAIL");
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("returns 200 and invokes mock mailer without exhausting real quota", async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "warga.civigo@example.com" }),
      });

      const res = await forgotPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toContain("berhasil dikirim");

      // Pastikan fungsi Supabase Auth dipanggil dengan benar
      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "warga.civigo@example.com",
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("returns 400 if password is less than 8 characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: "short" }),
      });

      const res = await resetPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("WEAK_PASSWORD");
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("returns 401 if user recovery session is missing or expired", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid session" },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: "KataSandiBaru#2026" }),
      });

      const res = await resetPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("returns 200 when authenticated user sets valid password", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-123" } },
        error: null,
      });
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: "KataSandiBaru#2026" }),
      });

      const res = await resetPasswordHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "KataSandiBaru#2026" });
    });
  });
});
