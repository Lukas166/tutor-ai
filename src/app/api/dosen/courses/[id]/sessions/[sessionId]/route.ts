import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import {
  deleteCourseSession,
  DosenServiceError,
  updateCourseSessionStatus,
} from "@/lib/services/dosen.service";
import { z } from "zod/v4";

type SessionRouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

const updateSessionStatusSchema = z.object({
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

export async function PATCH(request: NextRequest, context: SessionRouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;
  const body = await request.json();
  const parsed = updateSessionStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const courseSession = await updateCourseSessionStatus(
      courseId,
      sessionId,
      session!.user.id,
      parsed.data.enrollmentKey,
      parsed.data.isActive
    );
    return NextResponse.json(courseSession);
  } catch (err) {
    return toErrorResponse(err, "Gagal mengubah status sesi");
  }
}

export async function DELETE(request: NextRequest, context: SessionRouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    await deleteCourseSession(
      courseId,
      sessionId,
      session!.user.id,
      parsed.data.enrollmentKey
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Gagal menghapus sesi");
  }
}
