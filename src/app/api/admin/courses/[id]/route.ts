import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type RouteContext } from "@/lib/api-utils";
import { updateCourseSchema } from "@/lib/schemas/course.schema";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const course = await courseService.getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const body = await request.json();
  const result = updateCourseSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  try {
    const course = await courseService.updateCourse(id, result.data);
    return NextResponse.json(course);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;

  try {
    await courseService.deleteCourse(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
