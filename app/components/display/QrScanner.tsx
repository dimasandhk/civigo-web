"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2, RefreshCw } from "lucide-react";

type CameraState = "starting" | "scanning" | "denied" | "insecure" | "unavailable";

/** Decoding every frame is wasted work; a QR held up to the camera stays there for seconds. */
const SCAN_INTERVAL_MS = 150;
/** jsQR is fast enough at this width and finds phone-screen QR codes reliably. */
const SCAN_WIDTH = 640;

const CAMERA_MESSAGES: Record<Exclude<CameraState, "starting" | "scanning">, string> = {
  denied: "Izin kamera ditolak. Izinkan akses kamera untuk situs ini di browser, lalu tekan Coba Lagi.",
  insecure: "Kamera hanya bisa dipakai lewat HTTPS atau localhost. Buka kios dari alamat HTTPS.",
  unavailable: "Kamera tidak ditemukan atau sedang dipakai aplikasi lain.",
};

/**
 * Pemulihan kontras untuk layar HP yang silau (overexposure / glare).
 * Ketika layar HP diarahkan ke webcam, backlight layar sering membuat modul gelap QR
 * terangkat menjadi abu-abu terang (tercuci). Fungsi ini merenggangkan rentang dinamis
 * luminans dengan kurva gamma untuk mengembalikan pemisahan modul hitam dan putih.
 */
function enhanceScreenContrast(data: Uint8ClampedArray): Uint8ClampedArray | null {
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 16) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  // Jika kontras tercuci (nilai minimum terlalu tinggi) tetapi masih memiliki variasi
  if (min > 35 && max - min > 30) {
    const range = max - min;
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      if (v <= min) lut[v] = 0;
      else if (v >= max) lut[v] = 255;
      else {
        const norm = (v - min) / range;
        lut[v] = Math.round(Math.pow(norm, 2.0) * 255);
      }
    }

    const enhanced = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
      const v = lut[lum];
      enhanced[i] = v;
      enhanced[i + 1] = v;
      enhanced[i + 2] = v;
      enhanced[i + 3] = 255;
    }
    return enhanced;
  }

  return null;
}

/**
 * Live camera preview that decodes QR codes with jsQR and reports each decoded
 * text through `onScan`. Works in every browser with getUserMedia; the native
 * BarcodeDetector is not used because Chrome on Windows does not have it.
 *
 * While `busy`, frames are not decoded (the kiosk is checking a ticket).
 * The camera is released when the component unmounts.
 */
export default function QrScanner({ onScan, busy }: { onScan: (text: string) => void; busy: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [mirrored, setMirrored] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Read inside the frame loop, which must not restart (and reopen the camera) when these change.
  const onScanRef = useRef(onScan);
  const busyRef = useRef(busy);
  useEffect(() => {
    onScanRef.current = onScan;
    busyRef.current = busy;
  });

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let lastScan = 0;

    async function start() {
      // Ditunda satu microtask supaya setState tidak terjadi sinkron di dalam effect.
      await Promise.resolve();
      if (cancelled) return;

      if (!window.isSecureContext) return setState("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setState("unavailable");

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        // Optimasi eksposur dan fokus otomatis jika didukung peramban
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === "function") {
          const caps = track.getCapabilities() as Record<string, unknown>;
          const adv: Record<string, unknown> = {};
          if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes("continuous")) {
            adv.exposureMode = "continuous";
          }
          if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
            adv.focusMode = "continuous";
          }
          if (Object.keys(adv).length > 0) {
            track.applyConstraints({ advanced: [adv] }).catch(() => {});
          }
        }
      } catch (err) {
        if (!cancelled) {
          const name = err instanceof DOMException ? err.name : "";
          setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
        }
        return;
      }

      const { default: jsQR } = await import("jsqr");
      const video = videoRef.current;
      if (cancelled || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Webcam kios menghadap warga: pratinjau dicerminkan supaya terasa seperti cermin.
      // Kamera belakang (tablet/HP) tidak dicerminkan.
      setMirrored(stream.getVideoTracks()[0]?.getSettings().facingMode !== "environment");

      video.srcObject = stream;
      await video.play().catch(() => {});
      if (cancelled) return;
      setState("scanning");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const tick = (time: number) => {
        if (cancelled) return;
        frame = requestAnimationFrame(tick);

        if (!ctx || busyRef.current || time - lastScan < SCAN_INTERVAL_MS) return;
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
        lastScan = time;

        const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        const { data } = ctx.getImageData(0, 0, width, height);
        let code = jsQR(data, width, height, { inversionAttempts: "dontInvert" });

        // Jika frame penuh tidak menemukan QR, coba fokuskan pada area bidik tengah (posisi layar HP)
        if (!code?.data) {
          const cropX = Math.round(width * 0.15);
          const cropY = Math.round(height * 0.15);
          const cropW = Math.round(width * 0.7);
          const cropH = Math.round(height * 0.7);
          const centerData = ctx.getImageData(cropX, cropY, cropW, cropH);

          // Coba scan area tengah dengan deteksi polaritas ganda
          code = jsQR(centerData.data, cropW, cropH, { inversionAttempts: "attemptBoth" });

          // Jika masih silau/tercuci, terapkan pemulihan kontras dinamis
          if (!code?.data) {
            const glareRecovered = enhanceScreenContrast(centerData.data);
            if (glareRecovered) {
              code = jsQR(glareRecovered, cropW, cropH, { inversionAttempts: "dontInvert" });
            }
          }
        }

        if (code?.data) onScanRef.current(code.data);
      };
      frame = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  const failed = state !== "starting" && state !== "scanning";

  return (
    <div className="relative flex aspect-4/3 w-[280px] sm:w-[340px] items-center justify-center overflow-hidden rounded-[16px] bg-zinc-800 shadow-soft">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Pratinjau kamera pemindai QR"
        className={`absolute inset-0 size-full object-cover ${mirrored ? "-scale-x-100" : ""} ${
          state === "scanning" ? "opacity-100" : "opacity-0"
        }`}
      />

      {state === "scanning" && (
        <>
          {/* Bingkai bidik */}
          <div className="pointer-events-none absolute inset-[18%] rounded-[12px] border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          <span className="absolute bottom-2.5 rounded-full bg-black/55 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-wider text-white">
            {busy ? "Memeriksa tiket..." : "Arahkan QR ke kamera"}
          </span>
        </>
      )}

      {state === "starting" && (
        <div className="flex flex-col items-center gap-2 text-white/80">
          <Loader2 className="size-8 animate-spin" />
          <span className="font-display text-xs font-semibold uppercase tracking-wider">Menyalakan kamera...</span>
        </div>
      )}

      {failed && (
        <div role="status" className="flex flex-col items-center gap-2.5 px-5 text-center text-white/90">
          <CameraOff className="size-8 text-white/70" />
          <p className="font-display text-xs leading-snug">{CAMERA_MESSAGES[state]}</p>
          <p className="font-display text-[11px] text-white/60">Anda tetap bisa mengetik NIK atau nomor antrean di bawah.</p>
          {state !== "insecure" && (
            <button
              type="button"
              onClick={() => {
                setState("starting");
                setAttempt((n) => n + 1);
              }}
              className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 font-display text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <RefreshCw size={13} /> Coba Lagi
            </button>
          )}
        </div>
      )}
    </div>
  );
}
