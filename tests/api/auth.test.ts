import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Gunakan vi.hoisted agar mock functions terdefinisi sebelum vi.mock di-hoist
const {
  mockResetPasswordForEmail,
  mockGetUser,
  mockUpdateUser,
  mockSignUp,
  mockSignInWithPassword,
  mockServiceUsersMaybeSingle,
} = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockServiceUsersMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockServiceUsersMaybeSingle,
        })),
      })),
    })),
  })),
}));

import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";

describe("Auth Endpoints (API Tests with Zero Email / API Key Consumption)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("returns 400 if full_name is too short", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "A",
          nik: "3578012345678901",
          email: "budi@example.com",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_NAME");
    });

    it("returns 400 if NIK is not 16 digits", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "12345",
          email: "budi@example.com",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_NIK");
    });

    it("returns 400 if email is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345678901",
          email: "bukan-email",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_EMAIL");
    });

    it("returns 400 if password is less than 8 characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345678901",
          email: "budi@example.com",
          password: "short",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("WEAK_PASSWORD");
    });

    it("returns 409 if NIK is already registered", async () => {
      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: { id: "existing-user-id" },
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345678901",
          email: "budi@example.com",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("NIK_ALREADY_EXISTS");
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("returns 409 if email is already registered in Supabase", async () => {
      mockServiceUsersMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockSignUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User already registered", code: "email_exists" },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345678901",
          email: "budi.duplikat@example.com",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("returns 201 with user profile and session when registration succeeds", async () => {
      mockServiceUsersMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: "new-user-123", email: "budi.baru@civigo.com" },
          session: {
            access_token: "jwt-token-123",
            refresh_token: "refresh-123",
            expires_at: 1780000000,
            expires_in: 3600,
          },
        },
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Budi Santoso",
          nik: "3578012345678901",
          email: "budi.baru@civigo.com",
          password: "Password123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.user.id).toBe("new-user-123");
      expect(json.user.nik).toBe("3578012345678901");
      expect(json.user.role).toBe("user");
      expect(json.session.access_token).toBe("jwt-token-123");
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "budi.baru@civigo.com",
          options: {
            data: {
              nik: "3578012345678901",
              full_name: "Budi Santoso",
            },
          },
        })
      );
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 if identifier or password missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "" }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("MISSING_CREDENTIALS");
    });

    it("returns 401 if credentials are invalid", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "warga@civigo.com",
          password: "WrongPassword!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 200 and tokens when logged in via email", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: "user-123", email: "warga1@civigo.com" },
          session: {
            access_token: "jwt-token-456",
            refresh_token: "refresh-456",
            expires_at: 1780000000,
            expires_in: 3600,
          },
        },
        error: null,
      });

      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "user-123",
          email: "warga1@civigo.com",
          nik: "0000999999999999",
          full_name: "Warga 1",
          role: "user",
          agency_id: null,
          location_id: null,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "warga1@civigo.com",
          password: "Password123!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.user.nik).toBe("0000999999999999");
      expect(json.session.access_token).toBe("jwt-token-456");
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "warga1@civigo.com",
        password: "Password123!",
      });
    });

    it("returns 200 when logged in via 16-digit NIK", async () => {
      // Step 1: NIK lookup
      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: { email: "warga1@civigo.com" },
      });

      // Step 2: Supabase signIn
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: "user-123", email: "warga1@civigo.com" },
          session: {
            access_token: "jwt-token-nik",
            refresh_token: "refresh-nik",
            expires_at: 1780000000,
            expires_in: 3600,
          },
        },
        error: null,
      });

      // Step 3: Profile fetch
      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "user-123",
          email: "warga1@civigo.com",
          nik: "0000999999999999",
          full_name: "Warga 1",
          role: "user",
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: "0000999999999999",
          password: "Password123!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "warga1@civigo.com",
        password: "Password123!",
      });
    });

    it("returns 200 when officer logs in with agency username prefix (disdukcapil)", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: "officer-123", email: "disdukcapil@civigo.com" },
          session: {
            access_token: "jwt-officer",
            refresh_token: "refresh-officer",
            expires_at: 1780000000,
            expires_in: 3600,
          },
        },
        error: null,
      });

      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "officer-123",
          email: "disdukcapil@civigo.com",
          nik: null,
          full_name: "Disdukcapil Surabaya",
          role: "instansi",
          agency_id: 1,
          location_id: 1,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "disdukcapil",
          password: "Password123!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.user.role).toBe("instansi");
      expect(json.user.agency_id).toBe(1);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "disdukcapil@civigo.com",
        password: "Password123!",
      });
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 if unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "No session" },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/me");
      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 200 and profile when valid Bearer token provided", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "warga1@civigo.com" } },
        error: null,
      });

      mockServiceUsersMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "user-123",
          email: "warga1@civigo.com",
          nik: "0000999999999999",
          full_name: "Warga 1",
          role: "user",
          agency_id: null,
          location_id: null,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          Authorization: "Bearer valid-token-xyz",
        },
      });

      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.user.email).toBe("warga1@civigo.com");
      expect(json.user.nik).toBe("0000999999999999");
      expect(mockGetUser).toHaveBeenCalledWith("valid-token-xyz");
    });
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
