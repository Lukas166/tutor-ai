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

  const course = await getDosenCourseById(courseId, session!.user.id);
  if (!course) {
    return NextResponse.json({ error: "Course tidak ditemukan" }, { status: 404 });
  }

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  // Handle JSON body (link or text content)
  if (contentTypeHeader.includes("application/json")) {
    const body = await request.json();
    const { title, type, url, content, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    }

    let fileName = "";
    let filePath = "";

    if (type === "link") {
      if (!url) return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
      fileName = description || url;
      filePath = `link:${url}`;
    } else if (type === "text") {
      if (!content) return NextResponse.json({ error: "Konten wajib diisi" }, { status: 400 });
      fileName = description || "Teks";
      filePath = `text:${content}`;
    } else {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    try {
      const material = await createMaterial(sessionId, session!.user.id, {
        title,
        fileName,
        filePath,
        fileSize: 0,
      });
      return NextResponse.json(material, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Internal error" },
        { status: 500 }
      );
    }
  }

  // Handle FormData (file upload)
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "File dan judul wajib diisi" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Hanya file PDF yang diperbolehkan" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", courseId, sessionId);
  await mkdir(uploadsDir, { recursive: true });

  const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const fileSavePath = path.join(uploadsDir, uniqueName);
  const bytes = await file.arrayBuffer();
  await writeFile(fileSavePath, Buffer.from(bytes));

  const publicPath = `/uploads/${courseId}/${sessionId}/${uniqueName}`;

  try {
    const material = await createMaterial(sessionId, session!.user.id, {
      title,
      fileName: file.name,
      filePath: publicPath,
      fileSize: file.size,
    });
    return NextResponse.json(material, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
