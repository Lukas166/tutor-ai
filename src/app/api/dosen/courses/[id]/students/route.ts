import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import {
  getDosenCourseById,
  listCourseStudents,
  removeStudentFromCourse,
} from "@/lib/services/dosen.service";

export async function GET(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;
  const course = await getDosenCourseById(id, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const students = await listCourseStudents(id);
  return NextResponse.json(students);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;
  const course = await getDosenCourseById(id, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const { studentId, enrollmentKey } = body;

  if (!studentId || !enrollmentKey) {
    return NextResponse.json({ error: "studentId dan enrollmentKey wajib diisi" }, { status: 400 });
  }

  if (enrollmentKey !== course.enrollmentKey) {
    return NextResponse.json({ error: "Enrollment key salah" }, { status: 403 });
  }

  const result = await removeStudentFromCourse(id, studentId);
  if (!result) {
    return NextResponse.json({ error: "Mahasiswa tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
