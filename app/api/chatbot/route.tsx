import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/chatbot/openai";
import { generateGeminiResponse } from "@/lib/chatbot/gemini";
import { createServiceClient } from "@/lib/supabase/service";

const supabase = createServiceClient();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotRequest {
  pertanyaan: string;
  riwayat?: ChatMessage[];
}

/**
 * Membersihkan simbol-simbol Markdown agar teks tampil bersih dan rapi
 * di UI aplikasi mobile tanpa menampilkan karakter mentah seperti ##, **, atau *.
 */
export function cleanMarkdownFormatting(text: string): string {
  if (!text) return "";

  return text
    // Hapus heading markdown: ## Judul -> Judul
    .replace(/^#{1,6}\s*(.*)$/gm, "$1")
    // Hapus format bold: **teks** -> teks, __teks__ -> teks
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    // Hapus format italic: *teks* -> teks
    .replace(/(?<!\S)\*(?!\s)(.*?)(?<!\s)\*(?!\S)/g, "$1")
    .replace(/(?<!\S)_(?!\s)(.*?)(?<!\s)_(?!\S)/g, "$1")
    // Hapus code blocks & backticks
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    // Hapus garis pemisah horizontal --- atau ***
    .replace(/^[-*_]{3,}$/gm, "")
    // Rapikan jarak enter berlebih (maksimal 2 baris baru)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SYSTEM_PROMPT = `
Anda adalah Asisten Virtual CiviGo untuk Mal Pelayanan Publik (MPP) Siola Surabaya.

Tugas Anda adalah membantu pengguna memahami informasi mengenai layanan publik, persyaratan berkas, jam operasional, dan alur aplikasi CiviGo berdasarkan DOKUMEN PANDUAN RESMI yang diberikan.

PANDUAN GAYA PENULISAN (SANGAT PENTING):
1. DILARANG KERAS MENGGUNAKAN SIMBOL MARKDOWN:
   - JANGAN gunakan tanda pagar (##, ###, #) untuk judul atau subjudul.
   - JANGAN gunakan tanda bintang ganda (**) untuk cetak tebal (misal: JANGAN tulis "**Buka Aplikasi**").
   - JANGAN gunakan tanda bintang tunggal (*) untuk cetak miring.
   - JANGAN gunakan tanda backtick (\`) atau garis pemisah (---).
2. Tuliskan jawaban dalam teks polos (plain text) yang bersih, alami, dan ramah seperti pesan chat WhatsApp resmi layanan pelanggan.
3. Untuk judul bagian, tuliskan teks biasa dengan akhiran titik dua, contoh:
Prosedur Check-in di Kios Siola:
4. Untuk urutan langkah, gunakan nomor biasa tanpa cetak tebal, contoh:
1. Buka aplikasi CiviGo pada smartphone Anda.
2. Masuk ke tab Antrean Saya.
5. Untuk daftar persyaratan atau rincian poin, gunakan tanda strip (-) biasa:
- KTP asli
- STNK asli
6. Berikan jarak spasi antar paragraf yang cukup agar pesan sangat nyaman dan mudah dibaca di layar HP warga.

PANDUAN KONTEN & JAWABAN:
1. Pahami padanan kata dan istilah awam warga (contoh: "perpanjang STNK tahunan" merujuk pada Pengesahan STNK & Pembayaran PKB Tahunan; "bikin KTP" merujuk pada Pembuatan KTP-el Baru; "surat kehilangan" merujuk pada SKTLK dari Kepolisian; "cara pakai civigo" merujuk pada alur aplikasi CiviGo dari registrasi, booking, hingga check-in kiosk).
2. Jelaskan fitur aplikasi CiviGo secara lengkap dan jelas jika warga bertanya seputar aplikasi, seperti:
   - Registrasi & Login (bisa pakai Email atau NIK 16 digit).
   - Booking tiket online & pemilihan layanan.
   - Fitur Anggota Keluarga (Family Booking) untuk mendaftarkan lansia/anak.
   - Check-in di kios fisik Siola (scan QR, tips miringkan HP 15 derajat jika silau, atau input manual 6 digit kode tiket).
   - Pembatalan tiket (jika berhalangan hadir agar kuota kembali).
   - Penanganan antrean (mundurkan antrean jika berkas kurang, atau jadwalkan ulang jika nomor hangus hari itu).
   - Pengisian ulasan layanan (rating bintang dan opsi "Nanti Saja").
3. Jangan mengarang data yang bertentangan dengan dokumen resmi. Tegaskan bahwa seluruh layanan di Dispendukcapil dan aplikasi CiviGo adalah 100% GRATIS (Rp 0).
4. Jika pertanyaan warga sama sekali di luar lingkup pelayanan publik MPP dan aplikasi CiviGo, sampaikan permohonan maaf dengan sopan dan sarankan warga untuk bertanya seputar layanan MPP atau menghubungi Loket Informasi MPP Siola Surabaya.
5. Gunakan bahasa Indonesia yang santun, ramah, dan profesional. Jangan pernah menyebutkan istilah teknis internal seperti prompt, embedding, vector, database, atau RAG.

DOKUMEN PANDUAN RESMI:
`;

export async function POST(
  request: NextRequest
) {
  try {
    const body: ChatbotRequest =
      await request.json();

    const pertanyaan =
      body.pertanyaan?.trim();

    const riwayat =
      body.riwayat ?? [];

    if (!pertanyaan) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Pertanyaan tidak boleh kosong.",
        },
        {
          status: 400,
        }
      );
    }

    if (pertanyaan.length > 500) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Pertanyaan terlalu panjang. Maksimal 500 karakter.",
        },
        {
          status: 400,
        }
      );
    }

    const embeddingResponse =
      await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: pertanyaan.replace(/\n/g, " "),
      });

    const queryEmbedding =
      embeddingResponse.data[0].embedding;

    const { data: documents, error } =
      await (supabase.rpc as unknown as (
        functionName: string,
        args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        }
      ) => Promise<{
        data: Array<{
          content: string;
          metadata: {
            source?: string;
            page?: number;
            chunk?: number;
          };
          similarity: number;
        }> | null;
        error: unknown;
      }>)(
        "match_documents",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.45,
          match_count: 5,
        }
      );

    if (error) {
      console.error(
        "[VECTOR SEARCH ERROR]",
        error
      );

      throw new Error(
        "Gagal melakukan pencarian dokumen."
      );
    }

    const retrievedDocuments =
      documents ?? [];

    const context =
      retrievedDocuments.length > 0
        ? retrievedDocuments
            .map(
              (
                document: {
                  content: string;
                  metadata: {
                    source?: string;
                    page?: number;
                    chunk?: number;
                  };
                  similarity: number;
                },
                index: number
              ) => {
                return `
[Dokumen ${index + 1}]
Sumber: ${
                  document.metadata?.source ??
                  "Tidak diketahui"
                }
Relevansi: ${document.similarity.toFixed(3)}

${document.content}
`;
              }
            )
            .join("\n\n")
        : "Tidak ada informasi yang relevan ditemukan.";

    const chatHistory = (Array.isArray(riwayat) ? riwayat : [])
      .filter(
        (message): message is ChatMessage =>
          Boolean(message) &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      )
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 1000),
      }));

    let jawaban = "Maaf, saya tidak dapat memberikan jawaban.";
    let provider: "openai" | "gemini" = "openai";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT + context,
          },
          ...chatHistory,
          {
            role: "user",
            content: pertanyaan,
          },
        ],
      });

      jawaban =
        response.choices[0]?.message?.content ??
        "Maaf, saya tidak dapat memberikan jawaban.";
    } catch (openaiError) {
      console.warn(
        "[CHATBOT] OpenAI completion gagal, mencoba fallback ke Google Gemini:",
        openaiError
      );

      if (process.env.GEMINI_API_KEY) {
        jawaban = await generateGeminiResponse({
          systemPrompt: SYSTEM_PROMPT + context,
          riwayat: chatHistory,
          pertanyaan,
        });
        provider = "gemini";
      } else {
        throw openaiError;
      }
    }

    const sanitizedJawaban = cleanMarkdownFormatting(jawaban);

    return NextResponse.json({
      status: "success",
      jawaban: sanitizedJawaban,
      cached: false,
      provider,
    });
  } catch (error) {
    console.error(
      "[CHATBOT ERROR]",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Terjadi kesalahan saat memproses pertanyaan.",
      },
      {
        status: 500,
      }
    );
  }
}