import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAdmin } from "@/lib/api-utils";
import {
  deleteAdminCourseSession,
  updateAdminCourseSession,
} from "@/lib/services/course.service";

type AdminSessionRouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

const updateSessionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: AdminSessionRouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;
  const parsed = updateSessionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const session = await updateAdminCourseSession(courseId, sessionId, parsed.data);
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui sesi" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: AdminSessionRouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;

  try {
    await deleteAdminCourseSession(courseId, sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus sesi" },
      { status: 500 }
    );
  }
}
