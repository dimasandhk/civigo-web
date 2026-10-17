interface GeminiMessage {
  role: "user" | "assistant";
  content: string;
}

interface GenerateGeminiParams {
  systemPrompt: string;
  riwayat?: GeminiMessage[];
  pertanyaan: string;
  model?: string;
}

/**
 * Memanggil Google Gemini REST API (v1beta generateContent)
 * sebagai LLM fallback ketika OpenAI API mengalami kendala kuota, rate limit, atau timeout.
 */
export async function generateGeminiResponse({
  systemPrompt,
  riwayat = [],
  pertanyaan,
  model = "gemini-flash-latest",
}: GenerateGeminiParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diset.");
  }

  // Gemini REST API menggunakan role 'user' dan 'model'
  const contents = [
    ...riwayat.map((msg) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    })),
    {
      role: "user" as const,
      parts: [{ text: pertanyaan }],
    },
  ];

  const payload = {
    contents,
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.1,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini tidak mengembalikan respons teks yang valid.");
  }

  return text.trim();
}
