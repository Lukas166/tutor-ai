import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { getDosenCourseById } from "@/lib/services/dosen.service";

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
