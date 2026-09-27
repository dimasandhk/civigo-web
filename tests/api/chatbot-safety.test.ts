import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Gunakan vi.hoisted agar mock functions terdefinisi sebelum vi.mock di-hoist oleh Vitest
const { mockCreateEmbedding, mockCreateChatCompletion, mockRpc } = vi.hoisted(() => ({
  mockCreateEmbedding: vi.fn(),
  mockCreateChatCompletion: vi.fn(),
  mockRpc: vi.fn(),
}));

// Mock OpenAI API secara total untuk menjamin ZERO OpenAI tokens / cost exhausted
vi.mock("@/lib/chatbot/openai", () => ({
  openai: {
    embeddings: {
      create: mockCreateEmbedding,
    },
    chat: {
      completions: {
        create: mockCreateChatCompletion,
      },
    },
  },
}));

// Mock Supabase RPC match_documents
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

import { POST as chatbotHandler } from "@/app/api/chatbot/route";

describe("AI Chatbot Route Safety (Zero OpenAI API Quota Exhaustion)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when pertanyaan is empty without calling OpenAI", async () => {
    const req = new NextRequest("http://localhost:3000/api/chatbot", {
      method: "POST",
      body: JSON.stringify({ pertanyaan: "   " }),
    });

    const res = await chatbotHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe("error");
    expect(mockCreateEmbedding).not.toHaveBeenCalled();
    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
  });

  it("answers user question using mocked embedding and completion (0 API token spent)", async () => {
    mockCreateEmbedding.mockResolvedValueOnce({
      data: [{ embedding: [0.01, 0.02, 0.03] }],
    });

    mockRpc.mockResolvedValueOnce({
      data: [
        {
          content: "Syarat perpanjangan STNK tahunan adalah membawa KTP asli dan STNK asli.",
          metadata: { source: "samsat.pdf" },
          similarity: 0.89,
        },
      ],
      error: null,
    });

    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Untuk perpanjangan STNK tahunan, syarat yang dibutuhkan adalah KTP asli dan STNK asli.",
          },
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/chatbot", {
      method: "POST",
      body: JSON.stringify({
        pertanyaan: "Apa syarat perpanjang STNK?",
      }),
    });

    const res = await chatbotHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("success");
    expect(json.jawaban).toContain("KTP asli dan STNK asli");

    // Pastikan mock terpanggil dengan aman tanpa memanggil endpoint OpenAI asli
    expect(mockCreateEmbedding).toHaveBeenCalledTimes(1);
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      "match_documents",
      expect.objectContaining({ query_embedding: [0.01, 0.02, 0.03] })
    );
  });
});
