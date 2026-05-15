import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAdmin, type RouteContext } from "@/lib/api-utils";
import {
  createAdminCourseSession,
  listAdminCourseSessions,
} from "@/lib/services/course.service";

const sessionSchema = z.object({
  title: z.string().trim().min(1, "Judul sesi wajib diisi"),
  description: z.string().trim().nullable().optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const sessions = await listAdminCourseSessions(courseId);
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const parsed = sessionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const newSession = await createAdminCourseSession(
      courseId,
      session!.user.id,
      parsed.data
    );
    return NextResponse.json(newSession, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat sesi" },
      { status: 500 }
    );
  }
}
