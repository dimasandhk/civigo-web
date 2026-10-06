import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/chatbot/openai";
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
Anda adalah Asisten AI untuk Mal Pelayanan Publik (MPP).

Tugas Anda adalah membantu pengguna memahami informasi
mengenai layanan, persyaratan dokumen, dan prosedur
yang tersedia di Mal Pelayanan Publik.

ATURAN PENTING:

1. Jawab hanya berdasarkan CONTEXT yang diberikan.
2. Jangan mengarang informasi yang tidak terdapat dalam CONTEXT.
3. Jika informasi yang ditanyakan tidak terdapat dalam CONTEXT,
   jawab:
   "Maaf, saya tidak tahu karena informasi tersebut
   tidak ada di dalam dokumen."
4. Gunakan bahasa yang sama dengan bahasa pengguna.
5. Jawab dengan jelas, singkat, dan mudah dipahami.
6. Jangan menyebutkan bahwa Anda menggunakan embedding,
   vector database, RAG, atau proses internal lainnya.
7. Jika pengguna bertanya hal di luar informasi MPP yang tersedia,
   gunakan jawaban fallback.

CONTEXT:
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
          match_threshold: 0.65,
          match_count: 3,
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

    const response =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,

        messages: [
          {
            role: "system",
            content:
              SYSTEM_PROMPT + context,
          },

          ...chatHistory,

          {
            role: "user",
            content: pertanyaan,
          },
        ],
      });

    const jawaban =
      response.choices[0]?.message?.content ??
      "Maaf, saya tidak dapat memberikan jawaban.";

    return NextResponse.json({
      status: "success",
      jawaban,
      cached: false,
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