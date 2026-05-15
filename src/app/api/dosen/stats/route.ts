import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import { getDosenStats } from "@/lib/services/dosen.service";

export async function GET(request: NextRequest) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const stats = await getDosenStats(session!.user.id);
  return NextResponse.json(stats);
}
