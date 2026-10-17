/**
 * Synthesize a 2-tone pleasant ding-dong airport/civic chime using the Web Audio API.
 * Pure oscillator synthesis: Zero network requests, zero MP3 assets, zero 404s.
 */
export function playChime(ctx?: AudioContext | null): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined") {
        resolve();
        return;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const audioCtx = ctx || new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const now = audioCtx.currentTime;

      // First Tone (High Ding): 659.25 Hz (E5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Second Tone (Low Dong): 523.25 Hz (C5)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(523.25, now + 0.35);
      gain2.gain.setValueAtTime(0.38, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 1.1);

      setTimeout(() => {
        resolve();
      }, 950);
    } catch {
      resolve();
    }
  });
}

/**
 * Format a queue number into a natural Indonesian spoken phrase.
 * e.g. "A-01" -> "A, kosong satu", "B-12" -> "B, satu dua"
 */
export function formatQueueNumberForSpeech(queueNumber: string): string {
  const clean = queueNumber.trim().toUpperCase();
  return clean
    .split("")
    .map((char) => {
      if (char === "-") return " ";
      if (char === "0") return "kosong ";
      return `${char} `;
    })
    .join("");
}

/**
 * Announce the called queue number and counter via Web Speech API.
 */
export async function announceQueueCall(
  queueNumber: string,
  counterName: string,
  audioCtx?: AudioContext | null
): Promise<void> {
  // First play the chime
  await playChime(audioCtx);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterances

    const spokenNumber = formatQueueNumberForSpeech(queueNumber);
    const spokenCounter = counterName.replace(/Loket/i, "Loket ");
    const text = `Nomor antrean, ${spokenNumber}, silakan menuju ${spokenCounter}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.88; // slightly slower for civic clarity
    utterance.pitch = 1.0;

    // Pick an Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith("id") || v.name.toLowerCase().includes("indonesia")
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Fail silently on unsupported devices
  }
}
