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

const SYSTEM_PROMPT = `
Anda adalah Asisten Virtual CiviGo untuk Mal Pelayanan Publik (MPP) Siola Surabaya.

Tugas Anda adalah membantu pengguna memahami informasi mengenai layanan publik, persyaratan berkas, jam operasional, dan alur aplikasi CiviGo berdasarkan DOKUMEN PANDUAN RESMI yang diberikan.

PANDUAN MENJAWAB:
1. Pahami padanan kata dan istilah awam warga (contoh: "perpanjang STNK tahunan" merujuk pada Pengesahan STNK & Pembayaran PKB Tahunan; "bikin KTP" merujuk pada Pembuatan KTP-el Baru; "surat kehilangan" merujuk pada SKTLK dari Kepolisian).
2. Jawab secara ramah, terstruktur, dan jelas (gunakan poin-poin terurut untuk persyaratan dan tahapan prosedur agar mudah dipahami warga).
3. Jangan mengarang data yang bertentangan dengan dokumen. Bila relevan, sebutkan informasi penting seperti layanan gratis (Rp 0 di Dispendukcapil), kewajiban membawa berkas asli, atau tips check-in.
4. Jika pertanyaan warga sama sekali di luar lingkup pelayanan publik MPP dan aplikasi CiviGo, sampaikan permohonan maaf dengan sopan dan sarankan warga untuk bertanya seputar layanan MPP atau menghubungi Loket Informasi MPP Siola Surabaya.
5. Gunakan bahasa Indonesia yang santun dan profesional. Jangan pernah menyebutkan proses teknis internal seperti embedding, vector database, prompt, atau RAG.

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

    return NextResponse.json({
      status: "success",
      jawaban,
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