import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
  })),
}));

import { POST as changePassword } from "@/app/api/auth/change-password/route";

describe("Change Password Endpoint (API Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when missing current_password or new_password", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: "oldPassword123" }),
    });

    const res = await changePassword(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("MISSING_FIELDS");
  });

  it("returns 400 when new_password is shorter than 8 characters", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: "oldPassword123", new_password: "short" }),
    });

    const res = await changePassword(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("WEAK_PASSWORD");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "No session" },
    });

    const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: "oldPassword123", new_password: "newValidPassword123" }),
    });

    const res = await changePassword(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when current_password is wrong", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "citizen@civigo.id" } },
      error: null,
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token-123",
      },
      body: JSON.stringify({ current_password: "wrongPassword", new_password: "newValidPassword123" }),
    });

    const res = await changePassword(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("successfully updates password when credentials are valid", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "citizen@civigo.id" } },
      error: null,
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockUpdateUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token-123",
      },
      body: JSON.stringify({ current_password: "correctOldPassword", new_password: "brandNewPassword123" }),
    });

    const res = await changePassword(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.message).toBe("Kata sandi Anda berhasil diperbarui.");
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "brandNewPassword123" });
  });
});
