import type { Metadata } from "next";
import PageHeader from "../../components/admin/PageHeader";
import ProfileNameForm from "../../components/admin/ProfileNameForm";
import ChangePasswordForm from "../../components/admin/ChangePasswordForm";
import { requireOfficer } from "@/lib/auth/session";
import { resolveAgencyContext } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Profil — CiviGo",
};

const ROLE_LABEL = {
  user: "Warga",
  instansi: "Petugas instansi",
  super_admin: "Admin sistem",
} as const;

export default async function ProfilPage() {
  const [profile, context] = await Promise.all([requireOfficer(), resolveAgencyContext()]);

  // Hanya nama yang bisa diubah sendiri. Email, peran, instansi, dan cabang diatur admin:
  // grant kolom `users` untuk `authenticated` memang hanya `full_name`.
  const accountInfo = [
    { label: "Email", value: profile.email },
    { label: "Peran", value: ROLE_LABEL[profile.role] },
    { label: "Instansi", value: context.agencyName },
    { label: "Cabang", value: context.locationName ?? "Semua cabang" },
  ];

  return (
    <div className="flex flex-col gap-[34px]">
      <PageHeader title="Profil" description="Kelola informasi dan keamanan akun Anda" />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="flex flex-col gap-6 rounded-[20px] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[20px] font-semibold text-ink">Informasi Akun</h2>
            <p className="text-sm text-muted">
              Email, peran, instansi, dan cabang diatur oleh admin. Hubungi admin untuk mengubahnya.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {accountInfo.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="font-display text-xs font-semibold uppercase tracking-wider text-queue-idle">
                  {label}
                </dt>
                <dd className="break-words font-display text-[15px] font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <ProfileNameForm fullName={profile.full_name} />
        </section>

        <section className="flex flex-col gap-6 rounded-[20px] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[20px] font-semibold text-ink">Ubah Password</h2>
            <p className="text-sm text-muted">
              Masukkan password saat ini untuk mengonfirmasi. Tidak ada kode yang dikirim ke email.
            </p>
          </div>

          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
