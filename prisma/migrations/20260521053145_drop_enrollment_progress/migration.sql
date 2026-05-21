/*
  Warnings:

  - You are about to drop the `enrollment_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "enrollment_progress" DROP CONSTRAINT "enrollment_progress_courseSessionId_fkey";

-- DropForeignKey
ALTER TABLE "enrollment_progress" DROP CONSTRAINT "enrollment_progress_enrollmentId_fkey";

-- DropIndex
DROP INDEX "material_chunk_embedding_hnsw_idx";

-- DropTable
DROP TABLE "enrollment_progress";
