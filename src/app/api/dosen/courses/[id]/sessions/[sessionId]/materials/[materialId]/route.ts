import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import {
  deleteMaterial,
  DosenServiceError,
  updateMaterialStatus,
} from "@/lib/services/dosen.service";
import { z } from "zod/v4";

type MaterialRouteContext = {
  params: Promise<{ id: string; sessionId: string; materialId: string }>;
};

const updateMaterialStatusSchema = z.object({
  enrollmentKey: z.string().trim().min(1, "Enrollment key wajib diisi"),
  isActive: z.boolean(),
});

const confirmationSchema = z.object({
  enrollmentKey: z.string().trim().min(1, "Enrollment key wajib diisi"),
});

function toErrorResponse(err: unknown, fallback: string) {
  if (err instanceof DosenServiceError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 500 }
  );
}

export async function PATCH(request: NextRequest, context: MaterialRouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id: courseId, sessionId, materialId } = await context.params;
  const body = await request.json();
  const parsed = updateMaterialStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const material = await updateMaterialStatus(
      courseId,
      sessionId,
      materialId,
      session!.user.id,
      parsed.data.enrollmentKey,
      parsed.data.isActive
    );
    return NextResponse.json(material);
  } catch (err) {
    return toErrorResponse(err, "Gagal mengubah status materi");
  }
}

export async function DELETE(request: NextRequest, context: MaterialRouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id: courseId, sessionId, materialId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    await deleteMaterial(
      courseId,
      sessionId,
      materialId,
      session!.user.id,
      parsed.data.enrollmentKey
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Gagal menghapus materi");
  }
}
