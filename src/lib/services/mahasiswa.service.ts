import prisma from "@/lib/prisma";
import { generateCourseCover, isCurrentCourseCover } from "@/lib/course-cover";

type CourseWithCover = {
  id: string;
  title: string;
  enrollmentKey: string;
  coverImage: string | null;
};

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

export async function listMahasiswaCourses(mahasiswaId: string, search?: string) {
  const courses = await prisma.course.findMany({
    where: {
      isActive: true,
      enrollments: {
        some: {
          userId: mahasiswaId,
          isActive: true,
        },
      },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      creator: { select: { id: true, name: true } },
      instructors: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      _count: { select: { instructors: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ensureCourseCovers(courses);
}

export async function getMahasiswaRecentActivities(mahasiswaId: string, days = 7) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: mahasiswaId,
      isActive: true,
      course: { isActive: true },
    },
    select: { courseId: true },
  });

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  if (courseIds.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const materials = await prisma.material.findMany({
    where: {
      isActive: true,
      createdAt: { gte: cutoffDate },
      courseSession: {
        isActive: true,
        courseId: { in: courseIds },
        course: { isActive: true },
      },
    },
    select: {
      id: true,
      title: true,
      fileName: true,
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

  const sessions = await prisma.courseSession.findMany({
    where: {
      isActive: true,
      courseId: { in: courseIds },
      course: { isActive: true },
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
    ...materials.map((material) => ({
      id: material.id,
      type: "material" as const,
      title: material.title,
      detail: `${material.courseSession.title} - ${material.fileName}`,
      courseId: material.courseSession.course.id,
      courseName: material.courseSession.course.title,
      createdAt: material.createdAt.toISOString(),
    })),
    ...sessions.map((session) => ({
      id: session.id,
      type: "session" as const,
      title: session.title,
      detail: "Sesi baru tersedia",
      courseId: session.course.id,
      courseName: session.course.title,
      createdAt: session.createdAt.toISOString(),
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}
