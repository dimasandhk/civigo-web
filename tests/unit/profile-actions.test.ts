import { describe, it, expect, vi, beforeEach } from "vitest";

type AuthErr = { code?: string; message: string } | null;

const { session, verifier, profileUpdate, mockRevalidatePath, mockRedirect } = vi.hoisted(() => ({
  // Client sesi petugas (cookie) dari @/lib/supabase/server.
  session: {
    user: { id: "officer-1", email: "samsat@civigo.com" } as { id: string; email: string } | null,
    updateUserError: null as AuthErr,
    updateUser: vi.fn(),
  },
  // Client sekali pakai untuk mengecek password saat ini.
  verifier: {
    signInError: null as AuthErr,
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  profileUpdate: {
    result: { data: { id: "officer-1" }, error: null } as { data: unknown; error: { message: string } | null },
    calls: [] as { payload: unknown; filters: [string, unknown][] }[],
  },
  mockRevalidatePath: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: session.user } }),
      updateUser: async (attrs: unknown) => {
        session.updateUser(attrs);
        return { data: {}, error: session.updateUserError };
      },
    },
    from: () => {
      const call = { payload: undefined as unknown, filters: [] as [string, unknown][] };
      const query = {
        update: (payload: unknown) => ((call.payload = payload), query),
        eq: (column: string, value: unknown) => (call.filters.push([column, value]), query),
        select: () => query,
        maybeSingle: async () => {
          profileUpdate.calls.push(call);
          return profileUpdate.result;
        },
      };
      return query;
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: async (creds: unknown) => {
        verifier.signIn(creds);
        return { data: {}, error: verifier.signInError };
      },
      signOut: async (opts: unknown) => {
        verifier.signOut(opts);
        return { error: null };
      },
    },
  }),
}));

import { changePassword, updateProfileName } from "@/lib/auth/actions";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const validPassword = { current_password: "LamaSekali1", new_password: "BaruSekali2", confirm_password: "BaruSekali2" };

beforeEach(() => {
  session.user = { id: "officer-1", email: "samsat@civigo.com" };
  session.updateUserError = null;
  verifier.signInError = null;
  profileUpdate.result = { data: { id: "officer-1" }, error: null };
  profileUpdate.calls = [];
});

describe("changePassword (Profil → Ubah Password)", () => {
  it.each([
    [{ ...validPassword, current_password: "" }, "currentPassword", "Password saat ini wajib diisi."],
    [{ ...validPassword, new_password: "pendek", confirm_password: "pendek" }, "newPassword", "Password baru minimal 8 karakter."],
    [{ ...validPassword, new_password: "LamaSekali1", confirm_password: "LamaSekali1" }, "newPassword", "Password baru harus berbeda dari password saat ini."],
    [{ ...validPassword, confirm_password: "BedaSekali3" }, "confirmPassword", "Konfirmasi password tidak sama dengan password baru."],
  ])("rejects invalid input before touching Supabase (%#)", async (fields, key, message) => {
    const result = await changePassword(undefined, form(fields));
    expect(result?.fieldErrors).toEqual({ [key]: message });
    expect(verifier.signIn).not.toHaveBeenCalled();
    expect(session.updateUser).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password and does not change anything", async () => {
    verifier.signInError = { code: "invalid_credentials", message: "Invalid login credentials" };
    const result = await changePassword(undefined, form(validPassword));
    expect(result?.fieldErrors).toEqual({ currentPassword: "Password saat ini salah." });
    expect(session.updateUser).not.toHaveBeenCalled();
  });

  it("reports rate limiting on the current-password check", async () => {
    verifier.signInError = { code: "over_request_rate_limit", message: "rate limit" };
    const result = await changePassword(undefined, form(validPassword));
    expect(result?.error).toContain("Terlalu banyak percobaan");
    expect(session.updateUser).not.toHaveBeenCalled();
  });

  it("verifies with the account's own email, revokes only the check session, then updates", async () => {
    const result = await changePassword(undefined, form(validPassword));

    expect(verifier.signIn).toHaveBeenCalledWith({ email: "samsat@civigo.com", password: "LamaSekali1" });
    // `local`, bukan `global`: sesi petugas di loket lain tidak boleh ikut keluar.
    expect(verifier.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(session.updateUser).toHaveBeenCalledWith({ password: "BaruSekali2", current_password: "LamaSekali1" });
    expect(result?.message).toContain("Password berhasil diubah");
  });

  it.each([
    ["same_password", "fieldErrors"],
    ["weak_password", "fieldErrors"],
    ["reauthentication_needed", "error"],
    ["unexpected_failure", "error"],
  ] as const)("maps Supabase error %s to a readable message", async (code, kind) => {
    session.updateUserError = { code, message: "detail" };
    const result = await changePassword(undefined, form(validPassword));
    expect(result?.[kind]).toBeTruthy();
    expect(result?.message).toBeUndefined();
  });

  it("redirects to login when there is no session", async () => {
    session.user = null;
    await expect(changePassword(undefined, form(validPassword))).rejects.toThrow("NEXT_REDIRECT:/");
  });
});

describe("updateProfileName (Profil → Nama Lengkap)", () => {
  it.each([
    ["A", "Nama lengkap minimal 2 karakter."],
    ["x".repeat(101), "Nama lengkap maksimal 100 karakter."],
  ])("rejects an invalid name (%#)", async (name, message) => {
    const result = await updateProfileName(undefined, form({ full_name: name }));
    expect(result?.fieldErrors).toEqual({ fullName: message });
    expect(profileUpdate.calls).toHaveLength(0);
  });

  it("updates only full_name on the caller's own row and revalidates the admin layout", async () => {
    const result = await updateProfileName(undefined, form({ full_name: "  Petugas Samsat MPP  " }));

    expect(profileUpdate.calls).toEqual([
      { payload: { full_name: "Petugas Samsat MPP" }, filters: [["id", "officer-1"]] },
    ]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin", "layout");
    expect(result?.message).toBe("Nama lengkap berhasil diperbarui.");
  });

  it("reports when no row was updated", async () => {
    profileUpdate.result = { data: null, error: null };
    const result = await updateProfileName(undefined, form({ full_name: "Petugas Samsat" }));
    expect(result?.error).toBe("Profil akun tidak ditemukan.");
  });
});
