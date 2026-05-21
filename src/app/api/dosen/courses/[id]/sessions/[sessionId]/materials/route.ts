import { NextRequest, NextResponse } from "next/server";
import { requireDosen } from "@/lib/api-utils";
import {
  createMaterial,
  getCourseSessionInCourse,
  getDosenCourseById,
} from "@/lib/services/dosen.service";
import { createMaterialProcessingJob } from "@/lib/material-processing/jobs";
import {
  deleteMaterialFilesFromSupabase,
  uploadMaterialFileToSupabase,
} from "@/lib/supabase-storage";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

  const courseSession = await getCourseSessionInCourse(courseId, sessionId);
  if (!courseSession) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  // Handle JSON body (link or text content)
  if (contentTypeHeader.includes("application/json")) {
    const body = await request.json();
    const { title, type, url, content, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    }

    if (type === "link") {
      const cleanUrl = typeof url === "string" ? url.trim() : "";
      if (!cleanUrl) return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
      if (!isValidHttpUrl(cleanUrl)) {
        return NextResponse.json({ error: "URL harus diawali http:// atau https://" }, { status: 400 });
      }

      try {
        const material = await createMaterial(sessionId, session!.user.id, {
          title,
          materialType: "link",
          description: description || null,
          fileName: description || cleanUrl,
          filePath: cleanUrl,
          externalUrl: cleanUrl,
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

    if (type === "text") {
      const cleanContent = typeof content === "string" ? content.trim() : "";
      if (!cleanContent) return NextResponse.json({ error: "Konten wajib diisi" }, { status: 400 });

      try {
        const material = await createMaterial(sessionId, session!.user.id, {
          title,
          materialType: "text",
          description: description || null,
          fileName: description || "Materi teks",
          filePath: "",
          textContent: cleanContent,
          fileSize: Buffer.byteLength(cleanContent, "utf8"),
        });
        return NextResponse.json(material, { status: 201 });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Internal error" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
  }

  // Handle FormData (file upload)
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const cleanTitle = title?.trim() ?? "";

  if (!file || !cleanTitle) {
    return NextResponse.json({ error: "File dan judul wajib diisi" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Hanya file PDF yang diperbolehkan" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  let uploadedStoragePath: string | null = null;

  try {
    const uploadedFile = await uploadMaterialFileToSupabase({
      buffer: Buffer.from(bytes),
      contentType: file.type || "application/pdf",
      fileName: file.name,
      courseId,
      sessionId,
      sessionTitle: courseSession.title,
      materialTitle: cleanTitle,
    });
    uploadedStoragePath = uploadedFile.storagePath;

    const material = await createMaterial(sessionId, session!.user.id, {
      title: cleanTitle,
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
      console.error("Gagal menandai job processing material:", processingJobError);
    }

    return NextResponse.json(material, { status: 201 });
  } catch (err) {
    if (uploadedStoragePath) {
      await deleteMaterialFilesFromSupabase([uploadedStoragePath]).catch((cleanupError) => {
        console.error("Gagal membersihkan file upload yang tidak jadi disimpan:", cleanupError);
      });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
