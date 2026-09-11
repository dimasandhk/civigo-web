import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import LoginForm from "./components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — CiviGo",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user && (user.role === "instansi" || user.role === "super_admin")) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-12">
      <div className="flex w-full max-w-115 flex-col items-center gap-[35px] rounded-[30px] bg-white px-[50px] py-[45px] shadow-soft">
        <header className="flex flex-col items-center gap-4">
          <Image
            src="/civigo-logo.svg"
            alt="CiviGo"
            width={601}
            height={537}
            priority
            className="h-20 w-auto"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[32px] font-extrabold leading-10 text-ink">
              Masuk ke CiviGo
            </h1>
            <p className="font-display text-[15px] leading-[19px] text-queue-idle">
              Gunakan akun instansi Anda untuk melanjutkan.
            </p>
          </div>
        </header>

        <LoginForm />
      </div>
    </main>
  );
}
