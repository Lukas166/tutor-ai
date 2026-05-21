import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import {
  deleteMaterial,
  DosenServiceError,
  updateMaterialStatus,
  updateMaterial,
} from "@/lib/services/dosen.service";
import { z } from "zod/v4";

type MaterialRouteContext = {
  params: Promise<{ id: string; sessionId: string; materialId: string }>;
};

const updateMaterialSchema = z.object({
  enrollmentKey: z.string().trim().min(1, "Enrollment key wajib diisi"),
  isActive: z.boolean().optional(),
  title: z.string().trim().min(1, "Judul wajib diisi").optional(),
  description: z.string().trim().optional().nullable(),
  externalUrl: z.string().trim().optional().nullable(),
  textContent: z.string().trim().optional().nullable(),
}).refine(data => data.isActive !== undefined || data.title !== undefined, {
  message: "Tidak ada data yang diubah",
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
  const parsed = updateMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    let material;
    if (parsed.data.isActive !== undefined) {
      material = await updateMaterialStatus(
        courseId,
        sessionId,
        materialId,
        session!.user.id,
        parsed.data.enrollmentKey,
        parsed.data.isActive
      );
    } else if (parsed.data.title !== undefined) {
      material = await updateMaterial(
        courseId,
        sessionId,
        materialId,
        session!.user.id,
        parsed.data.enrollmentKey,
        {
          title: parsed.data.title,
          description: parsed.data.description,
          externalUrl: parsed.data.externalUrl,
          textContent: parsed.data.textContent,
        }
      );
    }
    return NextResponse.json(material);
  } catch (err) {
    return toErrorResponse(err, "Gagal mengubah materi");
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
