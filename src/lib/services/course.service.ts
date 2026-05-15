import prisma from "@/lib/prisma";
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/schemas/course.schema";
import { generateCourseCover, isCurrentCourseCover } from "@/lib/course-cover";

function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}

function generateEnrollmentKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

type CourseWithCover = {
  id: string;
  title: string;
  enrollmentKey: string;
  coverImage: string | null;
};

const materialSelect = {
  id: true,
  title: true,
  materialType: true,
  description: true,
  fileName: true,
  filePath: true,
  storagePath: true,
  publicUrl: true,
  externalUrl: true,
  textContent: true,
  fileSize: true,
  isActive: true,
  isProcessed: true,
  processingStatus: true,
  processingProgress: true,
  processingError: true,
  processingJobId: true,
  processingStartedAt: true,
  processingCompletedAt: true,
  pageCount: true,
  chunkCount: true,
  embeddingModel: true,
  embeddingDimensions: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function ensureCourseCover<T extends CourseWithCover>(course: T): Promise<T> {
  if (isCurrentCourseCover(course.coverImage)) return course;

  const coverImage = generateCourseCover(course);
  await prisma.course.update({
    where: { id: course.id },
    data: { coverImage },
  });

  return { ...course, coverImage };
}

async function ensureCourseCovers<T extends CourseWithCover>(courses: T[]) {
  return Promise.all(courses.map(ensureCourseCover));
}

export async function listCourses(search?: string) {
  const courses = await prisma.course.findMany({
    where: search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { enrollmentKey: { contains: search, mode: 'insensitive' } },
      ]
    } : {},
    include: {
      creator: { select: { id: true, name: true } },
      _count: {
        select: {
          instructors: true,
          enrollments: true,
          sessions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ensureCourseCovers(courses);
}

export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      instructors: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: { enrollments: true, sessions: true },
      },
    },
  });

  if (!course) return null;
  return ensureCourseCover(course);
}

export async function createCourse(data: CreateCourseInput, adminId: string) {
  // Generate unique enrollment key with retry
  let enrollmentKey = generateEnrollmentKey();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.course.findUnique({ where: { enrollmentKey } });
    if (!existing) break;
    enrollmentKey = generateEnrollmentKey();
    attempts++;
  }

  const courseId = crypto.randomUUID();

  return prisma.course.create({
    data: {
      id: courseId,
      createdBy: adminId,
      title: data.title,
      description: data.description ?? null,
      enrollmentKey,
      coverImage: generateCourseCover({
        id: courseId,
        title: data.title,
        enrollmentKey,
      }),
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { instructors: true, enrollments: true, sessions: true } },
    },
  });
}

export async function updateCourse(id: string, data: UpdateCourseInput) {
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Course tidak ditemukan");
  }

  return prisma.course.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteCourse(id: string) {
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Course tidak ditemukan");
  }

  await prisma.course.delete({ where: { id } });
  return { success: true };
}

export async function assignInstructor(courseId: string, userId: string) {
  // Verify user is a dosen
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User tidak ditemukan");
  }
  if (user.role !== "dosen") {
    throw new Error("Hanya user dengan role dosen yang dapat ditugaskan sebagai pengajar");
  }

  // Check not already assigned
  const existing = await prisma.courseInstructor.findFirst({
    where: { courseId, userId },
  });
  if (existing) {
    throw new Error("Dosen sudah ditugaskan ke course ini");
  }

  return prisma.courseInstructor.create({
    data: {
      id: crypto.randomUUID(),
      courseId,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function removeInstructor(courseId: string, userId: string) {
  const existing = await prisma.courseInstructor.findFirst({
    where: { courseId, userId },
  });
  if (!existing) {
    throw new Error("Assignment tidak ditemukan");
  }

  await prisma.courseInstructor.delete({ where: { id: existing.id } });
  return { success: true };
}

export async function listAdminCourseSessions(courseId: string) {
  const sessions = await prisma.courseSession.findMany({
    where: { courseId },
    include: {
      creator: { select: { id: true, name: true } },
      materials: {
        select: {
          ...materialSelect,
          processingLogs: {
            select: {
              id: true,
              status: true,
              message: true,
              error: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { materials: true } },
    },
    orderBy: { orderNumber: "asc" },
  });

  return serializeBigInt(sessions);
}

export async function createAdminCourseSession(
  courseId: string,
  adminId: string,
  data: { title: string; description?: string | null }
) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw new Error("Course tidak ditemukan");

  const lastSession = await prisma.courseSession.findFirst({
    where: { courseId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  const session = await prisma.courseSession.create({
    data: {
      id: crypto.randomUUID(),
      courseId,
      createdBy: adminId,
      title: data.title,
      description: data.description ?? null,
      orderNumber: (lastSession?.orderNumber ?? 0) + 1,
    },
    include: {
      creator: { select: { id: true, name: true } },
      materials: { select: materialSelect },
      _count: { select: { materials: true } },
    },
  });

  return serializeBigInt(session);
}

export async function updateAdminCourseSession(
  courseId: string,
  sessionId: string,
  data: { title?: string; description?: string | null; isActive?: boolean }
) {
  const session = await prisma.courseSession.findFirst({
    where: { id: sessionId, courseId },
    select: { id: true },
  });
  if (!session) throw new Error("Sesi tidak ditemukan");

  return prisma.courseSession.update({
    where: { id: sessionId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteAdminCourseSession(courseId: string, sessionId: string) {
  const session = await prisma.courseSession.findFirst({
    where: { id: sessionId, courseId },
    select: { id: true },
  });
  if (!session) throw new Error("Sesi tidak ditemukan");

  await prisma.courseSession.delete({ where: { id: sessionId } });
  return { success: true };
}

export async function createAdminMaterial(
  courseId: string,
  sessionId: string,
  adminId: string,
  data: {
    title: string;
    materialType: "file" | "link" | "text";
    description?: string | null;
    fileName: string;
    filePath: string;
    storagePath?: string | null;
    publicUrl?: string | null;
    externalUrl?: string | null;
    textContent?: string | null;
    fileSize: number;
  }
) {
  const session = await prisma.courseSession.findFirst({
    where: { id: sessionId, courseId },
    select: { id: true },
  });
  if (!session) throw new Error("Sesi tidak ditemukan");

  const material = await prisma.material.create({
    data: {
      id: crypto.randomUUID(),
      courseSessionId: sessionId,
      uploadedBy: adminId,
      title: data.title,
      materialType: data.materialType,
      description: data.description ?? null,
      fileName: data.fileName,
      filePath: data.filePath,
      storagePath: data.storagePath ?? null,
      publicUrl: data.publicUrl ?? null,
      externalUrl: data.externalUrl ?? null,
      textContent: data.textContent ?? null,
      fileSize: BigInt(data.fileSize),
      isProcessed: data.materialType !== "file",
      processingStatus: data.materialType === "file" ? "uploaded" : "ready",
      processingProgress: data.materialType === "file" ? 0 : 100,
      processingCompletedAt: data.materialType === "file" ? null : new Date(),
    },
    select: materialSelect,
  });

  return serializeBigInt(material);
}

export async function updateAdminMaterial(
  courseId: string,
  sessionId: string,
  materialId: string,
  data: {
    title?: string;
    description?: string | null;
    isActive?: boolean;
    externalUrl?: string | null;
    textContent?: string | null;
  }
) {
  const material = await prisma.material.findFirst({
    where: { id: materialId, courseSessionId: sessionId, courseSession: { courseId } },
    select: { id: true, materialType: true },
  });
  if (!material) throw new Error("Materi tidak ditemukan");

  const updated = await prisma.material.update({
    where: { id: materialId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.externalUrl !== undefined &&
        material.materialType === "link" && {
          externalUrl: data.externalUrl,
          filePath: data.externalUrl ?? "",
        }),
      ...(data.textContent !== undefined &&
        material.materialType === "text" && {
          textContent: data.textContent,
          filePath: "",
          fileSize: BigInt(Buffer.byteLength(data.textContent ?? "", "utf8")),
        }),
    },
    select: materialSelect,
  });

  return serializeBigInt(updated);
}

export async function deleteAdminMaterial(
  courseId: string,
  sessionId: string,
  materialId: string
) {
  const material = await prisma.material.findFirst({
    where: { id: materialId, courseSessionId: sessionId, courseSession: { courseId } },
    select: { id: true },
  });
  if (!material) throw new Error("Materi tidak ditemukan");

  await prisma.material.delete({ where: { id: materialId } });
  return { success: true };
}

export async function getEnrollmentsByCourse(courseId: string) {
  return prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          npm: true,
          academicLevel: true,
          major: true,
          faculty: true,
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

export async function getCourseStats() {
  const [totalCourses, activeCourses, totalEnrollments] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { isActive: true } }),
    prisma.enrollment.count(),
  ]);

  return { totalCourses, activeCourses, totalEnrollments };
}

export async function getDosenList() {
  return prisma.user.findMany({
    where: { role: "dosen" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function getMahasiswaList() {
  return prisma.user.findMany({
    where: { role: "mahasiswa" },
    select: { id: true, name: true, email: true, npm: true, major: true },
    orderBy: { name: "asc" },
  });
}

export async function enrollStudent(courseId: string, userId: string) {
  // Verify course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new Error("Course tidak ditemukan");
  }

  // Verify user is a mahasiswa
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User tidak ditemukan");
  }
  if (user.role !== "mahasiswa") {
    throw new Error("Hanya user dengan role mahasiswa yang dapat didaftarkan");
  }

  // Check not already enrolled
  const existing = await prisma.enrollment.findFirst({
    where: { courseId, userId },
  });
  if (existing) {
    throw new Error("Mahasiswa sudah terdaftar di course ini");
  }

  return prisma.enrollment.create({
    data: {
      id: crypto.randomUUID(),
      courseId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          npm: true,
          academicLevel: true,
          major: true,
          faculty: true,
        },
      },
    },
  });
}

export async function removeEnrollment(courseId: string, userId: string) {
  const existing = await prisma.enrollment.findFirst({
    where: { courseId, userId },
  });
  if (!existing) {
    throw new Error("Enrollment tidak ditemukan");
  }

  await prisma.enrollment.delete({ where: { id: existing.id } });
  return { success: true };
}
