/*
  Warnings:

  - You are about to drop the `vector_chunk` table. If the table is not empty, all the data it contains will be lost.

*/

CREATE EXTENSION IF NOT EXISTS vector;

-- DropForeignKey
ALTER TABLE "vector_chunk" DROP CONSTRAINT "vector_chunk_materialId_fkey";

-- AlterTable
ALTER TABLE "material" ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "embeddingDimensions" INTEGER,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "pageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingJobId" TEXT,
ADD COLUMN     "processingProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'uploaded',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "vector_chunk";

-- CreateTable
CREATE TABLE "material_page" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "embeddedText" TEXT,
    "ocrText" TEXT,
    "finalText" TEXT NOT NULL,
    "textCharCount" INTEGER NOT NULL DEFAULT 0,
    "imageOcrAttempted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_chunk" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "embedding" vector(768),
    "chunkType" TEXT NOT NULL DEFAULT 'page_text',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_processing_log" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_processing_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_page_materialId_idx" ON "material_page"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "material_page_materialId_pageNumber_key" ON "material_page"("materialId", "pageNumber");

-- CreateIndex
CREATE INDEX "material_chunk_materialId_idx" ON "material_chunk"("materialId");

-- CreateIndex
CREATE INDEX "material_chunk_courseId_idx" ON "material_chunk"("courseId");

-- CreateIndex
CREATE INDEX "material_chunk_sessionId_idx" ON "material_chunk"("sessionId");

-- CreateIndex
CREATE INDEX "material_chunk_courseId_sessionId_idx" ON "material_chunk"("courseId", "sessionId");

-- CreateIndex
CREATE INDEX "material_chunk_materialId_pageNumber_idx" ON "material_chunk"("materialId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "material_chunk_materialId_chunkIndex_key" ON "material_chunk"("materialId", "chunkIndex");

-- CreateIndex
CREATE INDEX "material_processing_log_materialId_createdAt_idx" ON "material_processing_log"("materialId", "createdAt");

-- CreateIndex
CREATE INDEX "material_processingStatus_idx" ON "material"("processingStatus");

-- AddForeignKey
ALTER TABLE "material_page" ADD CONSTRAINT "material_page_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "course_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_processing_log" ADD CONSTRAINT "material_processing_log_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
