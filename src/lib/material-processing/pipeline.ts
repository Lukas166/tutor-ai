import prisma from "@/lib/prisma";
import { downloadMaterialFileFromSupabase } from "@/lib/supabase-storage";
import { chunkPdfPages } from "@/lib/material-processing/chunking";
import { embedMaterialChunk, toPgVector } from "@/lib/material-processing/embedding";
import {
  MATERIAL_EMBEDDING_DIMENSIONS,
  MATERIAL_EMBEDDING_MODEL,
} from "@/lib/material-processing/config";
import { extractPdfPages } from "@/lib/material-processing/pdf";
import {
  markMaterialProcessingFailed,
  type MaterialProcessingStatus,
  updateMaterialProcessingState,
} from "@/lib/material-processing/status";

type ProcessMaterialOptions = {
  onProgress?: (progress: number) => Promise<void> | void;
};

type MaterialForProcessing = NonNullable<
  Awaited<ReturnType<typeof getMaterialForProcessing>>
>;

async function getMaterialForProcessing(materialId: string) {
  return prisma.material.findUnique({
    where: { id: materialId },
    include: {
      courseSession: {
        select: {
          id: true,
          courseId: true,
        },
      },
    },
  });
}

async function setStatus(
  materialId: string,
  status: MaterialProcessingStatus,
  progress: number,
  message: string,
  options: ProcessMaterialOptions,
  extra: Parameters<typeof updateMaterialProcessingState>[1] = {
    status,
    progress,
  }
) {
  await updateMaterialProcessingState(materialId, {
    ...extra,
    status,
    progress,
    message,
  });
  await options.onProgress?.(progress);
}

async function clearPreviousProcessingOutput(materialId: string) {
  await prisma.materialPage.deleteMany({ where: { materialId } });
  await prisma.materialChunk.deleteMany({ where: { materialId } });
}

function assertProcessableMaterial(material: MaterialForProcessing) {
  if (material.materialType !== "file") {
    throw new Error("Hanya material file PDF yang dapat diproses embedding.");
  }

  if (!material.storagePath) {
    throw new Error("storagePath material kosong, worker tidak dapat membaca Supabase Storage.");
  }

  if (material.storagePath.startsWith("/")) {
    throw new Error("storagePath material masih path lokal/legacy, bukan object path Supabase Storage.");
  }

  if (!material.fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Material bukan file PDF.");
  }
}

async function persistPages(materialId: string, pages: Awaited<ReturnType<typeof extractPdfPages>>) {
  if (pages.length === 0) return;

  await prisma.materialPage.createMany({
    data: pages.map((page) => ({
      id: crypto.randomUUID(),
      materialId,
      pageNumber: page.pageNumber,
      embeddedText: page.embeddedText || null,
      ocrText: page.ocrText || null,
      finalText: page.finalText,
      textCharCount: page.finalText.length,
      imageOcrAttempted: page.imageOcrAttempted,
      metadata: page.metadata,
    })),
  });
}

async function insertMaterialChunk(input: {
  material: MaterialForProcessing;
  chunkIndex: number;
  pageNumber: number;
  content: string;
  tokenCount: number;
  chunkType: string;
  metadata: Record<string, string | number | boolean | null>;
  embedding: number[];
}) {
  const vector = toPgVector(input.embedding);
  const metadata = JSON.stringify(input.metadata);

  await prisma.$executeRaw`
    INSERT INTO "material_chunk" (
      "id",
      "materialId",
      "courseId",
      "sessionId",
      "pageNumber",
      "chunkIndex",
      "content",
      "tokenCount",
      "embedding",
      "chunkType",
      "metadata"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${input.material.id},
      ${input.material.courseSession.courseId},
      ${input.material.courseSessionId},
      ${input.pageNumber},
      ${input.chunkIndex},
      ${input.content},
      ${input.tokenCount},
      ${vector}::vector,
      ${input.chunkType},
      ${metadata}::jsonb
    )
  `;
}

export async function processMaterial(materialId: string, options: ProcessMaterialOptions = {}) {
  const material = await getMaterialForProcessing(materialId);

  if (!material) {
    throw new Error("Material tidak ditemukan.");
  }

  try {
    assertProcessableMaterial(material);

    await setStatus(materialId, "processing", 5, "Worker mulai memproses material", options, {
      status: "processing",
      progress: 5,
      startedAt: new Date(),
      pageCount: 0,
      chunkCount: 0,
      embeddingModel: MATERIAL_EMBEDDING_MODEL,
      embeddingDimensions: MATERIAL_EMBEDDING_DIMENSIONS,
    });

    await clearPreviousProcessingOutput(materialId);

    console.log(`[pipeline] Mengunduh file dari Supabase Storage...`);
    const pdfBuffer = await downloadMaterialFileFromSupabase(material.storagePath!);
    console.log(`[pipeline] File berhasil diunduh (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    await setStatus(materialId, "extracting", 10, "Mengambil embedded text PDF", options);
    console.log(`[pipeline] Memulai ekstraksi teks PDF...`);
    const pages = await extractPdfPages(pdfBuffer, {
      onExtractedText: async (pageNumber, pageCount) => {
        const progress = 10 + (pageNumber / pageCount) * 20;
        console.log(`[extract]  Halaman ${pageNumber}/${pageCount} — embedded text selesai (${progress.toFixed(0)}%)`);
        await updateMaterialProcessingState(materialId, {
          status: "extracting",
          progress,
          pageCount,
        });
        await options.onProgress?.(progress);
      },
      onOcrPage: async (pageNumber, pageCount) => {
        const progress = 35 + (pageNumber / pageCount) * 25;
        console.log(`[ocr]      Halaman ${pageNumber}/${pageCount} — OCR selesai (${progress.toFixed(0)}%)`);
        await updateMaterialProcessingState(materialId, {
          status: "ocr",
          progress,
          pageCount,
        });
        await options.onProgress?.(progress);
      },
    });
    console.log(`[pipeline] Ekstraksi PDF selesai — ${pages.length} halaman`);

    await persistPages(materialId, pages);
    console.log(`[pipeline] Halaman disimpan ke DB. Memulai chunking...`);
    await setStatus(materialId, "chunking", 65, "Melakukan cleaning text dan chunking", options, {
      status: "chunking",
      progress: 65,
      pageCount: pages.length,
    });

    const chunks = await chunkPdfPages(pages);
    if (chunks.length === 0) {
      throw new Error("Tidak ada teks yang berhasil diekstrak atau di-OCR dari PDF.");
    }
    console.log(`[chunking] Selesai — ${chunks.length} chunk dari ${pages.length} halaman`);

    await setStatus(materialId, "embedding", 70, "Membuat embedding Gemini", options, {
      status: "embedding",
      progress: 70,
      pageCount: pages.length,
      chunkCount: chunks.length,
    });
    console.log(`[pipeline] Memulai embedding ${chunks.length} chunk via Gemini...`);

    for (const chunk of chunks) {
      const chunkNum = chunk.chunkIndex + 1;
      console.log(`[embedding] Chunk ${chunkNum}/${chunks.length} (hal. ${chunk.pageNumber}, ${chunk.tokenCount} token) — mengirim ke Gemini...`);

      const embedding = await embedMaterialChunk(
        `${material.title} - halaman ${chunk.pageNumber}`,
        chunk.content
      );
      const progress = 70 + (chunkNum / chunks.length) * 20;
      console.log(`[embedding] Chunk ${chunkNum}/${chunks.length} — selesai (${progress.toFixed(0)}%)`);

      await insertMaterialChunk({
        material,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        chunkType: chunk.chunkType,
        metadata: chunk.metadata,
        embedding,
      });

      await updateMaterialProcessingState(materialId, {
        status: "embedding",
        progress,
        pageCount: pages.length,
        chunkCount: chunkNum,
      });
      await options.onProgress?.(progress);
    }

    await setStatus(materialId, "indexing", 95, "Menyimpan index pgvector", options, {
      status: "indexing",
      progress: 95,
      pageCount: pages.length,
      chunkCount: chunks.length,
      embeddingModel: MATERIAL_EMBEDDING_MODEL,
      embeddingDimensions: MATERIAL_EMBEDDING_DIMENSIONS,
    });

    await setStatus(materialId, "ready", 100, "Material siap digunakan untuk RAG", options, {
      status: "ready",
      progress: 100,
      pageCount: pages.length,
      chunkCount: chunks.length,
      embeddingModel: MATERIAL_EMBEDDING_MODEL,
      embeddingDimensions: MATERIAL_EMBEDDING_DIMENSIONS,
      completedAt: new Date(),
    });
    console.log(`[pipeline] SELESAI — ${pages.length} halaman, ${chunks.length} chunk, model: ${MATERIAL_EMBEDDING_MODEL}`);
  } catch (error) {
    await markMaterialProcessingFailed(materialId, error);
    throw error;
  }
}
