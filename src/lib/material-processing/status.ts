import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export const MATERIAL_PROCESSING_STATUSES = [
  "uploaded",
  "queued",
  "processing",
  "extracting",
  "ocr",
  "chunking",
  "embedding",
  "indexing",
  "ready",
  "failed",
] as const;

export type MaterialProcessingStatus = (typeof MATERIAL_PROCESSING_STATUSES)[number];

type StateInput = {
  status: MaterialProcessingStatus;
  progress: number;
  message?: string;
  error?: string | null;
  jobId?: string | null;
  pageCount?: number;
  chunkCount?: number;
  embeddingModel?: string | null;
  embeddingDimensions?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
};

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

export async function appendMaterialProcessingLog(
  materialId: string,
  status: MaterialProcessingStatus,
  message: string,
  options: {
    error?: string | null;
    metadata?: Prisma.InputJsonValue;
  } = {}
) {
  await prisma.materialProcessingLog.create({
    data: {
      id: crypto.randomUUID(),
      materialId,
      status,
      message,
      error: options.error ?? null,
      metadata: options.metadata ?? undefined,
    },
  });
}

export async function updateMaterialProcessingState(
  materialId: string,
  input: StateInput
) {
  const now = new Date();
  const isReady = input.status === "ready";
  const isFailed = input.status === "failed";

  await prisma.material.update({
    where: { id: materialId },
    data: {
      processingStatus: input.status,
      processingProgress: clampProgress(input.progress),
      processingError: isFailed ? input.error ?? "Processing gagal" : null,
      processingJobId: input.jobId === undefined ? undefined : input.jobId,
      processingStartedAt:
        input.startedAt === undefined ? undefined : input.startedAt,
      processingCompletedAt:
        input.completedAt === undefined
          ? isReady || isFailed
            ? now
            : undefined
          : input.completedAt,
      pageCount: input.pageCount === undefined ? undefined : input.pageCount,
      chunkCount: input.chunkCount === undefined ? undefined : input.chunkCount,
      embeddingModel:
        input.embeddingModel === undefined ? undefined : input.embeddingModel,
      embeddingDimensions:
        input.embeddingDimensions === undefined ? undefined : input.embeddingDimensions,
      isProcessed: isReady,
    },
  });

  if (input.message) {
    await appendMaterialProcessingLog(materialId, input.status, input.message, {
      error: input.error,
      metadata: input.metadata,
    });
  }
}

export async function markMaterialProcessingFailed(
  materialId: string,
  error: unknown,
  status: MaterialProcessingStatus = "failed"
) {
  const message = toErrorMessage(error);

  await updateMaterialProcessingState(materialId, {
    status,
    progress: 100,
    error: message,
    message: "Processing materi gagal",
  });
}
