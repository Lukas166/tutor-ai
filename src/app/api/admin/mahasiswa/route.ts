import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const mahasiswaList = await courseService.getMahasiswaList();
  return NextResponse.json(mahasiswaList);
}
