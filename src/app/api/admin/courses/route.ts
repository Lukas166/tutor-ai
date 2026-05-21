import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { createCourseSchema } from "@/lib/schemas/course.schema";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search") || undefined;
  const courses = await courseService.listCourses(search);
  return NextResponse.json(courses);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const result = createCourseSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  try {
    const course = await courseService.createCourse(result.data, session!.user.id);
    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
