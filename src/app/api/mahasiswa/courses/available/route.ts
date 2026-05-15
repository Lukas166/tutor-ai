import { NextRequest, NextResponse } from "next/server";
import { requireMahasiswa } from "@/lib/api-utils";
import { searchAvailableCourses } from "@/lib/services/mahasiswa.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const courses = await searchAvailableCourses(session!.user.id, search);

  return NextResponse.json(courses);
}
