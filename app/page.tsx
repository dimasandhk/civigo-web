import type { Metadata } from "next";
import Image from "next/image";
import Button from "./components/Button";
import Input from "./components/Input";
import Label from "./components/Label";

export const metadata: Metadata = {
  title: "Masuk — CiviGo",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-12">
      <div className="flex w-full max-w-[460px] flex-col items-center gap-[35px] rounded-[30px] bg-white px-[50px] py-[45px] shadow-soft">
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

        <form className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username Instansi</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="disdukcapil.bandung"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Masukkan password"
            />
          </div>

          <Button type="submit" className="mt-1">
            Masuk
          </Button>
        </form>
      </div>
    </main>
  );
}
