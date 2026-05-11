import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type RouteContext } from "@/lib/api-utils";
import * as courseService from "@/lib/services/course.service";

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId } = await context.params;
  const enrollments = await courseService.getEnrollmentsByCourse(courseId);
  return NextResponse.json(enrollments);
}
