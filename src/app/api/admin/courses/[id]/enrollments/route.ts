import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type RouteContext } from "@/lib/api-utils";
import { enrollStudentSchema } from "@/lib/schemas/course.schema";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const enrollments = await courseService.getEnrollmentsByCourse(courseId);
  return NextResponse.json(enrollments);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const body = await request.json();
  const result = enrollStudentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  try {
    const enrollment = await courseService.enrollStudent(courseId, result.data.userId);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mendaftarkan mahasiswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId diperlukan" }, { status: 400 });
  }

  try {
    await courseService.removeEnrollment(courseId, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus enrollment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
