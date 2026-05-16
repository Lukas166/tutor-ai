import { NextRequest, NextResponse } from "next/server";
import { requireMahasiswa, type RouteContext } from "@/lib/api-utils";
import { listMahasiswaCourseSessions } from "@/lib/services/mahasiswa.service";

export async function GET(request: NextRequest, context: RouteContext) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const { id } = await context.params;
  const sessions = await listMahasiswaCourseSessions(id, session!.user.id);

  if (!sessions) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(sessions);
}
