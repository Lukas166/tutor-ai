import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  getTutorChatSession,
  updateTutorSessionContext,
  renameTutorChatSession,
  deleteTutorChatSession,
} from "@/lib/tutor-ai/service";
import { requireTutorUser, tutorErrorResponse } from "@/lib/tutor-ai/route-helpers";

type TutorSessionRouteContext = {
  params: Promise<{ courseId: string; sessionId: string }>;
};

const patchSchema = z.object({
  selectedMaterialIds: z.array(z.string()).max(100).optional(),
  title: z.string().min(1).max(120).optional(),
});

export async function GET(request: NextRequest, context: TutorSessionRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId, sessionId } = await context.params;

  try {
    const session = await getTutorChatSession({ courseId, sessionId, userId: userId! });
    return NextResponse.json(session);
  } catch (err) {
    return tutorErrorResponse(err, "Gagal memuat chat session");
  }
}

export async function PATCH(request: NextRequest, context: TutorSessionRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId, sessionId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    // Handle rename
    if (parsed.data.title) {
      await renameTutorChatSession({
        courseId,
        sessionId,
        userId: userId!,
        title: parsed.data.title,
      });
    }

    // Handle context update
    if (parsed.data.selectedMaterialIds) {
      const session = await updateTutorSessionContext({
        courseId,
        sessionId,
        userId: userId!,
        selectedMaterialIds: parsed.data.selectedMaterialIds,
      });
      return NextResponse.json(session);
    }

    // If only title was changed, return the updated session
    const session = await getTutorChatSession({ courseId, sessionId, userId: userId! });
    return NextResponse.json(session);
  } catch (err) {
    return tutorErrorResponse(err, "Gagal memperbarui chat session");
  }
}

export async function DELETE(request: NextRequest, context: TutorSessionRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  const { courseId, sessionId } = await context.params;

  try {
    await deleteTutorChatSession({ courseId, sessionId, userId: userId! });
    return NextResponse.json({ success: true });
  } catch (err) {
    return tutorErrorResponse(err, "Gagal menghapus chat session");
  }
}
