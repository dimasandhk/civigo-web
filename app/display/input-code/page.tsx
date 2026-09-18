import type { Metadata } from "next";
import BackButton from "../../components/display/BackButton";
import CheckInForm from "../../components/display/CheckInForm";

export const metadata: Metadata = {
  title: "Pindai Kode Antrean — CiviGo",
};

export default function InputCodePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-board px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
      {/* Tombol Kembali ke Kiosk Menu */}
      <BackButton
        href="/display"
        className="absolute top-4 left-4 sm:top-6 sm:left-8 z-10"
      />

      <CheckInForm />
    </main>
  );
}

