import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import { createCourseSchema } from "@/lib/schemas/course.schema";
import { listDosenCourses, createDosenCourse } from "@/lib/services/dosen.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const courses = await listDosenCourses(session!.user.id, search);

  return NextResponse.json(courses);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const body = await request.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const course = await createDosenCourse(parsed.data, session!.user.id);
    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
