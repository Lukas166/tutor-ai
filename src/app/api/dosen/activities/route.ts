import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import { getDosenRecentActivities } from "@/lib/services/dosen.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") ?? "7", 10);
  const validDays = [7, 14, 30].includes(days) ? days : 7;

  const activities = await getDosenRecentActivities(session!.user.id, validDays);
  return NextResponse.json(activities);
}
