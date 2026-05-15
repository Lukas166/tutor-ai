import { NextRequest, NextResponse } from "next/server";
import { requireMahasiswa } from "@/lib/api-utils";
import { listMahasiswaCourses } from "@/lib/services/mahasiswa.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const courses = await listMahasiswaCourses(session!.user.id, search);

  return NextResponse.json(courses);
}
