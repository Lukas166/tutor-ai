import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import * as tutorPromptService from "@/lib/services/tutor-prompt.service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const configs = await tutorPromptService.getAllPromptConfigs();
  return NextResponse.json(configs);
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { academicLevel, responseMode, promptContent } = body;

    if (!academicLevel || !responseMode || !promptContent) {
      return NextResponse.json(
        { error: "academicLevel, responseMode, dan promptContent wajib diisi." },
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

    const result = await tutorPromptService.updatePromptConfig(
      academicLevel,
      responseMode,
      promptContent,
      session!.user.id
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan prompt." },
      { status: 500 }
    );
  }
}
