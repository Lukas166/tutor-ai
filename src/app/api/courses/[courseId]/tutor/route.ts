import { NextRequest, NextResponse } from "next/server";
import { getTutorOverview } from "@/lib/tutor-ai/service";
import { requireTutorUser, tutorErrorResponse } from "@/lib/tutor-ai/route-helpers";

type TutorRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(request: NextRequest, context: TutorRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId } = await context.params;

  try {
    const overview = await getTutorOverview(courseId, userId!);
    return NextResponse.json(overview);
  } catch (err) {
    return tutorErrorResponse(err, "Gagal memuat Tutor AI");
  }
}
