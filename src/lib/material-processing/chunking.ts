import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  MATERIAL_CHUNK_OVERLAP,
  MATERIAL_CHUNK_SIZE,
} from "@/lib/material-processing/config";
import type { ExtractedPdfPage } from "@/lib/material-processing/pdf";

export type PreparedMaterialChunk = {
  pageNumber: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  chunkType: string;
  metadata: Record<string, string | number | boolean | null>;
};

function estimateTokenCount(content: string) {
  return Math.max(1, Math.ceil(content.trim().length / 4));
}

export async function chunkPdfPages(pages: ExtractedPdfPage[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: MATERIAL_CHUNK_SIZE,
    chunkOverlap: MATERIAL_CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks: PreparedMaterialChunk[] = [];

  for (const page of pages) {
    if (!page.finalText.trim()) continue;

    const pageChunks = await splitter.splitText(page.finalText);

    for (const content of pageChunks) {
      const cleanContent = content.trim();
      if (!cleanContent) continue;

      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex: chunks.length,
        content: cleanContent,
        tokenCount: estimateTokenCount(cleanContent),
        chunkType: "page_text",
        metadata: {
          source: "pdf_page",
          chunkSize: MATERIAL_CHUNK_SIZE,
          chunkOverlap: MATERIAL_CHUNK_OVERLAP,
          pageNumber: page.pageNumber,
        },
      });
    }
  }

  return chunks;
}
