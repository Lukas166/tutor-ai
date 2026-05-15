import { NextRequest, NextResponse } from "next/server";
import { requireMahasiswa } from "@/lib/api-utils";
import { getMahasiswaRecentActivities } from "@/lib/services/mahasiswa.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);
  const validDays = [7, 14, 30].includes(days) ? days : 7;
  const activities = await getMahasiswaRecentActivities(session!.user.id, validDays);

  return NextResponse.json(activities);
}
