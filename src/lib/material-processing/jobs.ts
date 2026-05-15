import {
  markMaterialProcessingFailed,
  updateMaterialProcessingState,
} from "@/lib/material-processing/status";

export async function createMaterialProcessingJob(
  materialId: string,
  requestedBy?: string
) {
  try {
    await updateMaterialProcessingState(materialId, {
      status: "queued",
      progress: 2,
      jobId: `db:${materialId}`,
      message: "Materi masuk antrean processing database",
      metadata: { materialId, requestedBy: requestedBy ?? null },
    });
  } catch (error) {
    await markMaterialProcessingFailed(materialId, error);
    throw error;
  }
}
