import prisma from "@/lib/prisma";
import type { CreateCourseInput } from "@/lib/schemas/course.schema";

/* ─── Helpers ──────────────────────────────────────── */

function generateEnrollmentKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/** Convert BigInt values in an object to string for JSON serialization */
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}

/* ─── Courses ──────────────────────────────────────── */

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
      _count: { select: { enrollments: true, sessions: true } },
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

  await prisma.courseInstructor.create({
    data: { id: crypto.randomUUID(), courseId, userId: dosenId },
  });

  return course;
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

/* ─── Stats ────────────────────────────────────────── */

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

/* ─── Sessions ─────────────────────────────────────── */

export async function listCourseSessions(courseId: string) {
  const sessions = await prisma.courseSession.findMany({
    where: { courseId },
    include: {
      creator: { select: { id: true, name: true } },
      materials: {
        select: {
          id: true,
          title: true,
          fileName: true,
          filePath: true,
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

  return serializeBigInt(sessions);
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

  const session = await prisma.courseSession.create({
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
          filePath: true,
          fileSize: true,
          isActive: true,
          createdAt: true,
        },
      },
      _count: { select: { materials: true } },
    },
  });

  return serializeBigInt(session);
}

/* ─── Materials ────────────────────────────────────── */

export async function createMaterial(
  sessionId: string,
  dosenId: string,
  data: { title: string; fileName: string; filePath: string; fileSize: number }
) {
  const material = await prisma.material.create({
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
      filePath: true,
      fileSize: true,
      isActive: true,
      createdAt: true,
    },
  });

  return serializeBigInt(material);
}

/* ─── Enrollments (Student List) ───────────────────── */

export async function listCourseStudents(courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          npm: true,
          major: true,
        },
      },
    },
    orderBy: { user: { npm: "asc" } },
  });

  return enrollments;
}

export async function removeStudentFromCourse(courseId: string, studentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: studentId } },
  });

  if (!enrollment) return null;

  await prisma.enrollment.delete({
    where: { id: enrollment.id },
  });

  return { success: true };
}

/* ─── Recent Activities ────────────────────────────── */

export async function getDosenRecentActivities(dosenId: string, days = 7) {
  const courses = await prisma.course.findMany({
    where: { instructors: { some: { userId: dosenId } } },
    select: { id: true },
  });
  const courseIds = courses.map((c) => c.id);
  if (courseIds.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get latest materials across all dosen courses within the date range
  const materials = await prisma.material.findMany({
    where: {
      courseSession: { courseId: { in: courseIds } },
      createdAt: { gte: cutoffDate },
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      filePath: true,
      createdAt: true,
      courseSession: {
        select: {
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get latest sessions created within the date range
  const sessions = await prisma.courseSession.findMany({
    where: { 
      courseId: { in: courseIds },
      createdAt: { gte: cutoffDate },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Merge and sort by createdAt
  type ActivityItem = {
    id: string;
    type: "material" | "session";
    title: string;
    detail: string;
    courseId: string;
    courseName: string;
    createdAt: string;
  };

  const activities: ActivityItem[] = [
    ...materials.map((m) => ({
      id: m.id,
      type: "material" as const,
      title: m.title,
      detail: `${m.courseSession.title} — ${m.fileName}`,
      courseId: m.courseSession.course.id,
      courseName: m.courseSession.course.title,
      createdAt: m.createdAt.toISOString(),
    })),
    ...sessions.map((s) => ({
      id: s.id,
      type: "session" as const,
      title: s.title,
      detail: s.course.title,
      courseId: s.course.id,
      courseName: s.course.title,
      createdAt: s.createdAt.toISOString(),
    })),
  ];

  // Deduplicate: keep only the latest per id
  const seen = new Map<string, ActivityItem>();
  for (const a of activities) {
    const key = `${a.type}-${a.id}`;
    if (!seen.has(key) || a.createdAt > seen.get(key)!.createdAt) {
      seen.set(key, a);
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50); // Hard cap at 50 activities to avoid huge payloads
}
