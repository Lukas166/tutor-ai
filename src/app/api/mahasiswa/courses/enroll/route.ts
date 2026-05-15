import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireMahasiswa } from "@/lib/api-utils";
import { enrollMahasiswaCourse } from "@/lib/services/mahasiswa.service";

const enrollCourseSchema = z.object({
  courseId: z.string().trim().min(1, "Course wajib dipilih"),
  enrollmentKey: z.string().trim().min(1, "Enrollment key wajib diisi"),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = enrollCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const enrollment = await enrollMahasiswaCourse(
      session!.user.id,
      parsed.data.courseId,
      parsed.data.enrollmentKey
    );

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal enroll course" },
      { status: 400 }
    );
  }
}
