import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import {
  deleteDosenCourse,
  DosenServiceError,
  getDosenCourseById,
  updateDosenCourseStatus,
} from "@/lib/services/dosen.service";
import { z } from "zod/v4";

const updateCourseStatusSchema = z.object({
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

export async function GET(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;
  const course = await getDosenCourseById(id, session!.user.id);

  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateCourseStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const course = await updateDosenCourseStatus(
      id,
      session!.user.id,
      parsed.data.enrollmentKey,
      parsed.data.isActive
    );
    return NextResponse.json(course);
  } catch (err) {
    return toErrorResponse(err, "Gagal mengubah status course");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    await deleteDosenCourse(id, session!.user.id, parsed.data.enrollmentKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Gagal menghapus course");
  }
}
