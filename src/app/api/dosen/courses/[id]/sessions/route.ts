import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import {
  getDosenCourseById,
  listCourseSessions,
  createCourseSession,
} from "@/lib/services/dosen.service";
import { z } from "zod/v4";

const createSessionSchema = z.object({
  title: z.string().min(1, "Judul sesi wajib diisi"),
  description: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;

  // Verify dosen owns this course
  const course = await getDosenCourseById(id, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const sessions = await listCourseSessions(id);
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id } = await context.params;

  // Verify dosen owns this course
  const course = await getDosenCourseById(id, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const newSession = await createCourseSession(id, session!.user.id, parsed.data);
    return NextResponse.json(newSession, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
