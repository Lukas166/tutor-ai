import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import prisma from "@/lib/prisma";

type AdminMaterialItemRouteContext = {
  params: Promise<{ id: string; sessionId: string; materialId: string }>;
};

export async function POST(request: NextRequest, context: AdminMaterialItemRouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId, materialId } = await context.params;

  try {
    const material = await prisma.material.findFirst({
      where: { id: materialId, courseSessionId: sessionId, courseSession: { courseId } },
      select: { id: true, materialType: true, processingStatus: true },
    });

    if (!material) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    if (material.materialType !== "file") {
      return NextResponse.json({ error: "Hanya materi file (PDF) yang dapat di-retry" }, { status: 400 });
    }

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: {
        processingStatus: "queued",
        processingProgress: 0,
        processingError: null,
        processingJobId: null,
        isProcessed: false,
      },
      select: {
        id: true,
        processingStatus: true,
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengulang pemrosesan materi" },
      { status: 500 }
    );
  }
}
