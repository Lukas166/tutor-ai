import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import * as userService from "@/lib/services/user.service";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const [userStats, courseStats] = await Promise.all([
    userService.getUserStats(),
    courseService.getCourseStats(),
  ]);

  return NextResponse.json({ ...userStats, ...courseStats });
}
