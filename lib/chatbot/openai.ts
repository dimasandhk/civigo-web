import OpenAI from "openai";

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum diset.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Lazy/fallback fallback for build-time static evaluation
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});