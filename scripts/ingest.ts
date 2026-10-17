import "dotenv/config";

import fs from "fs";
import path from "path";
import { openai } from "../lib/chatbot/openai";
import { createServiceClient } from "@/lib/supabase/service";

const supabase = createServiceClient();

const DATA_DIR = path.join(process.cwd(), "public", "data");

function splitTextIntoSections(text: string, fileName: string): string[] {
  const lines = text.split("\n");
  const docTitle = lines[0]?.trim() || fileName;

  // Split by major sections (e.g. "\nA. ", "\nB. ", "\n1. ", "\n2. ")
  const rawSections = text.split(/\n(?=[A-Z]\. |\d+\. [A-Z])/g);
  const chunks: string[] = [];

  for (const raw of rawSections) {
    const trimmed = raw.trim();
    if (trimmed.length < 40) continue;

    // If a section is very long (> 1500 chars), split by double newline
    if (trimmed.length > 1500) {
      const paragraphs = trimmed.split(/\n\s*\n/);
      let current = `[${docTitle}]\n\n`;

      for (const p of paragraphs) {
        if ((current + p).length > 1500 && current.length > 60) {
          chunks.push(current.trim());
          current = `[${docTitle}]\n\n${p}\n\n`;
        } else {
          current += `${p}\n\n`;
        }
      }
      if (current.trim().length > 60) {
        chunks.push(current.trim());
      }
    } else {
      chunks.push(`[${docTitle}]\n\n${trimmed}`);
    }
  }

  return chunks;
}

async function ingestTXT(filePath: string) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Membaca: ${fileName}`);

  const text = fs.readFileSync(filePath, "utf-8");
  console.log(`Total karakter: ${text.length}`);

  const chunks = splitTextIntoSections(text, fileName);
  console.log(`Total chunks: ${chunks.length}`);

  if (chunks.length === 0) return;

  console.log(`Mengenerate embedding batch untuk ${chunks.length} chunks...`);
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  const rows = chunks.map((chunk, i) => ({
    content: chunk,
    metadata: {
      source: fileName,
      chunk: i,
    },
    embedding: embeddingResponse.data[i].embedding,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("documents").insert(rows);

  if (error) {
    throw error;
  }

  console.log(`✓ ${fileName} berhasil di-ingest (${rows.length} chunks)`);
}

async function main() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.toLowerCase().endsWith(".txt"))
    .sort();

  if (files.length === 0) {
    throw new Error("Tidak ada file TXT di folder data/");
  }

  console.log("🧹 Membersihkan tabel documents lama di Supabase...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("documents").delete().neq("id", 0);
  console.log("✓ Tabel documents bersih.");

  console.log(`Mulai meng-ingest ${files.length} dokumen panduan ke Supabase...`);
  for (const file of files) {
    await ingestTXT(path.join(DATA_DIR, file));
  }

  console.log("\n✨ Selesai! Semua dokumen RAG berhasil di-ingest ke Supabase.");
}

main().catch((error) => {
  console.error("INGEST ERROR:", error);
  process.exit(1);
});