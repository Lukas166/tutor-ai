import prisma from "@/lib/prisma";
import type { CreateCourseInput } from "@/lib/schemas/course.schema";

function generateEnrollmentKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function listDosenCourses(dosenId: string, search?: string) {
  const whereClause: Record<string, unknown> = {
    instructors: { some: { userId: dosenId } },
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.course.findMany({
    where: whereClause,
    include: {
      creator: { select: { id: true, name: true } },
      _count: {
        select: {
          enrollments: true,
          sessions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDosenCourse(data: CreateCourseInput, dosenId: string) {
  let enrollmentKey = generateEnrollmentKey();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.course.findUnique({ where: { enrollmentKey } });
    if (!existing) break;
    enrollmentKey = generateEnrollmentKey();
    attempts++;
  }

  const courseId = crypto.randomUUID();

  const course = await prisma.course.create({
    data: {
      id: courseId,
      createdBy: dosenId,
      title: data.title,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      enrollmentKey,
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });

  // Auto-assign the dosen as instructor
  await prisma.courseInstructor.create({
    data: {
      id: crypto.randomUUID(),
      courseId,
      userId: dosenId,
    },
  });

  return course;
}

export async function getDosenStats(dosenId: string) {
  const courses = await prisma.course.findMany({
    where: { instructors: { some: { userId: dosenId } } },
    select: { id: true },
  });

  const courseIds = courses.map((c) => c.id);

  const [totalCourses, totalStudents, totalSessions] = await Promise.all([
    Promise.resolve(courseIds.length),
    courseIds.length > 0
      ? prisma.enrollment.count({ where: { courseId: { in: courseIds } } })
      : Promise.resolve(0),
    courseIds.length > 0
      ? prisma.courseSession.count({ where: { courseId: { in: courseIds } } })
      : Promise.resolve(0),
  ]);

  return { totalCourses, totalStudents, totalSessions };
}

export async function getDosenCourseById(courseId: string, dosenId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      creator: { select: { id: true, name: true } },
      instructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });

  if (!course) return null;

  const isInstructor = course.instructors.some((i) => i.user.id === dosenId);
  if (!isInstructor) return null;

  return course;
}

export async function listCourseSessions(courseId: string) {
  return prisma.courseSession.findMany({
    where: { courseId },
    include: {
      creator: { select: { id: true, name: true } },
      materials: {
        select: {
          id: true,
          title: true,
          fileName: true,
          fileSize: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { materials: true } },
    },
    orderBy: { orderNumber: "asc" },
  });
}

export async function createCourseSession(
  courseId: string,
  dosenId: string,
  data: { title: string; description?: string | null }
) {
  const lastSession = await prisma.courseSession.findFirst({
    where: { courseId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  const nextOrder = (lastSession?.orderNumber ?? 0) + 1;

  return prisma.courseSession.create({
    data: {
      id: crypto.randomUUID(),
      courseId,
      createdBy: dosenId,
      title: data.title,
      description: data.description ?? null,
      orderNumber: nextOrder,
    },
    include: {
      creator: { select: { id: true, name: true } },
      materials: {
        select: {
          id: true,
          title: true,
          fileName: true,
          fileSize: true,
          isActive: true,
          createdAt: true,
        },
      },
      _count: { select: { materials: true } },
    },
  });
}

export async function createMaterial(
  sessionId: string,
  dosenId: string,
  data: { title: string; fileName: string; filePath: string; fileSize: number }
) {
  return prisma.material.create({
    data: {
      id: crypto.randomUUID(),
      courseSessionId: sessionId,
      uploadedBy: dosenId,
      title: data.title,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: BigInt(data.fileSize),
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileSize: true,
      isActive: true,
      createdAt: true,
    },
  });
}
