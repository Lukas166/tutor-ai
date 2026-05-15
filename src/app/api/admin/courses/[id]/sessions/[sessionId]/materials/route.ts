import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { createMaterialProcessingJob } from "@/lib/material-processing/jobs";
import { createAdminMaterial } from "@/lib/services/course.service";
import { uploadMaterialFileToSupabase } from "@/lib/supabase-storage";

type AdminMaterialRouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, context: AdminMaterialRouteContext) {
  const { error, session } = await requireAdmin(request);
  if (error) return error;

  const { id: courseId, sessionId } = await context.params;
  const contentTypeHeader = request.headers.get("content-type") ?? "";

  if (contentTypeHeader.includes("application/json")) {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const type = body.type;

    if (!title) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });

    try {
      if (type === "link") {
        const url = typeof body.url === "string" ? body.url.trim() : "";
        if (!url) return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
        if (!isValidHttpUrl(url)) {
          return NextResponse.json({ error: "URL harus diawali http:// atau https://" }, { status: 400 });
        }

        const material = await createAdminMaterial(courseId, sessionId, session!.user.id, {
          title,
          materialType: "link",
          description,
          fileName: description || url,
          filePath: url,
          externalUrl: url,
          fileSize: 0,
        });
        return NextResponse.json(material, { status: 201 });
      }

      if (type === "text") {
        const content = typeof body.content === "string" ? body.content.trim() : "";
        if (!content) return NextResponse.json({ error: "Konten wajib diisi" }, { status: 400 });

        const material = await createAdminMaterial(courseId, sessionId, session!.user.id, {
          title,
          materialType: "text",
          description,
          fileName: description || "Materi teks",
          filePath: "",
          textContent: content,
          fileSize: Buffer.byteLength(content, "utf8"),
        });
        return NextResponse.json(material, { status: 201 });
      }

      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Gagal menyimpan materi" },
        { status: 500 }
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;

  if (!file || !title?.trim()) {
    return NextResponse.json({ error: "File dan judul wajib diisi" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Hanya file PDF yang diperbolehkan" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const uploadedFile = await uploadMaterialFileToSupabase({
      buffer: Buffer.from(bytes),
      contentType: file.type || "application/pdf",
      fileName: file.name,
      courseId,
      sessionId,
    });

    const material = await createAdminMaterial(courseId, sessionId, session!.user.id, {
      title: title.trim(),
      materialType: "file",
      description: description?.trim() || null,
      fileName: uploadedFile.fileName,
      filePath: uploadedFile.publicUrl,
      storagePath: uploadedFile.storagePath,
      publicUrl: uploadedFile.publicUrl,
      fileSize: file.size,
    });

    try {
      await createMaterialProcessingJob(material.id, session!.user.id);
    } catch (processingJobError) {
      console.error("Gagal menandai job processing material admin:", processingJobError);
    }

    return NextResponse.json(material, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal upload materi" },
      { status: 500 }
    );
  }
}
