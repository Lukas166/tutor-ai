import { NextRequest, NextResponse } from "next/server";
import { createTutorChatSession, listTutorChatSessions } from "@/lib/tutor-ai/service";
import { requireTutorUser, tutorErrorResponse } from "@/lib/tutor-ai/route-helpers";

type TutorSessionsRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(request: NextRequest, context: TutorSessionsRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId } = await context.params;

  try {
    const sessions = await listTutorChatSessions(courseId, userId!);
    return NextResponse.json(sessions);
  } catch (err) {
    return tutorErrorResponse(err, "Gagal memuat riwayat chat");
  }
}

export async function POST(request: NextRequest, context: TutorSessionsRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId } = await context.params;

  try {
    const session = await createTutorChatSession(courseId, userId!);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return tutorErrorResponse(err, "Gagal membuat chat baru");
  }
}
