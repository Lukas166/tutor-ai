import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import * as tutorPromptService from "@/lib/services/tutor-prompt.service";

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { academicLevel, responseMode } = body;

    if (!academicLevel || !responseMode) {
      return NextResponse.json(
        { error: "academicLevel dan responseMode wajib diisi." },
        { status: 400 }
      );
    }

    const validLevels = ["S1", "S2", "S3"];
    const validModes = ["chat", "avatar"];

    if (!validLevels.includes(academicLevel)) {
      return NextResponse.json(
        { error: `academicLevel harus salah satu dari: ${validLevels.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validModes.includes(responseMode)) {
      return NextResponse.json(
        { error: `responseMode harus salah satu dari: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await tutorPromptService.resetPromptToDefault(
      academicLevel,
      responseMode,
      session!.user.id
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mereset prompt." },
      { status: 500 }
    );
  }
}
