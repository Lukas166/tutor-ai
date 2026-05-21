import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAdmin } from "@/lib/api-utils";
import {
  deleteAdminMaterial,
  updateAdminMaterial,
} from "@/lib/services/course.service";

type AdminMaterialItemRouteContext = {
  params: Promise<{ id: string; sessionId: string; materialId: string }>;
};

const updateMaterialSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
  externalUrl: z.string().trim().nullable().optional(),
  textContent: z.string().trim().nullable().optional(),
});

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest, context: AdminMaterialItemRouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId, materialId } = await context.params;
  const parsed = updateMaterialSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.externalUrl && !isValidHttpUrl(parsed.data.externalUrl)) {
    return NextResponse.json(
      { error: "URL harus diawali http:// atau https://" },
      { status: 400 }
    );
  }

  try {
    const material = await updateAdminMaterial(courseId, sessionId, materialId, parsed.data);
    return NextResponse.json(material);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui materi" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: AdminMaterialItemRouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId, materialId } = await context.params;

  try {
    await deleteAdminMaterial(courseId, sessionId, materialId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus materi" },
      { status: 500 }
    );
  }
}
