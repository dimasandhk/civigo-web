import "dotenv/config";

import fs from "fs";
import path from "path";
import { openai } from "../lib/chatbot/openai";
import { createServiceClient } from "@/lib/supabase/service";

const supabase = createServiceClient();

const DATA_DIR = path.join(process.cwd(), "public", "data");

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function splitText(
  text: string,
  chunkSize: number,
  overlap: number
) {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    const chunk = text
      .slice(start, end)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}

async function ingestTXT(filePath: string) {
  console.log(`Membaca: ${filePath}`);

  const text = fs.readFileSync(filePath, "utf-8");

  console.log(`Total karakter: ${text.length}`);

  const chunks = splitText(
    text,
    CHUNK_SIZE,
    CHUNK_OVERLAP
  );

  console.log(`Total chunks: ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    console.log(
      `Embedding ${i + 1}/${chunks.length}`
    );

    const embeddingResponse =
      await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

    const embedding =
      embeddingResponse.data[0].embedding;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("documents")
      .insert({
        content: chunk,
        metadata: {
          source: path.basename(filePath),
          chunk: i,
        },
        embedding,
      });

    if (error) {
      throw error;
    }
  }

  console.log(
    `✓ ${path.basename(filePath)} berhasil di-ingest`
  );
}

async function main() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) =>
      file.toLowerCase().endsWith(".txt")
    );

  if (files.length === 0) {
    throw new Error(
      "Tidak ada file TXT di folder data/"
    );
  }

  for (const file of files) {
    await ingestTXT(
      path.join(DATA_DIR, file)
    );
  }

  console.log("✓ Semua dokumen selesai.");
}

main().catch((error) => {
  console.error("INGEST ERROR:", error);
  process.exit(1);
});