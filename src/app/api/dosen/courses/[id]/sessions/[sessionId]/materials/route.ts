import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import { getDosenCourseById, createMaterial } from "@/lib/services/dosen.service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { error, session } = await requireDosen(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;

  // Verify dosen owns this course
  const course = await getDosenCourseById(courseId, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file || !title) {
    return NextResponse.json(
      { error: "File dan judul wajib diisi" },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Hanya file PDF yang diperbolehkan" },
      { status: 400 }
    );
  }

  // Save file to local uploads directory
  const uploadsDir = path.join(process.cwd(), "public", "uploads", courseId, sessionId);
  await mkdir(uploadsDir, { recursive: true });

  const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const filePath = path.join(uploadsDir, uniqueName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const publicPath = `/uploads/${courseId}/${sessionId}/${uniqueName}`;

  try {
    const material = await createMaterial(sessionId, session!.user.id, {
      title,
      fileName: file.name,
      filePath: publicPath,
      fileSize: file.size,
    });

    return NextResponse.json(
      {
        ...material,
        fileSize: material.fileSize?.toString() ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
