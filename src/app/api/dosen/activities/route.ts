import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import { getDosenRecentActivities } from "@/lib/services/dosen.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const activities = await getDosenRecentActivities(session!.user.id);
  return NextResponse.json(activities);
}
