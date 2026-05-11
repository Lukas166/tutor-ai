import prisma from "@/lib/prisma";
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/schemas/course.schema";

function generateEnrollmentKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function listCourses(search?: string) {
  return prisma.course.findMany({
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCourseById(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      instructors: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });
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

  return prisma.course.create({
    data: {
      id: crypto.randomUUID(),
      createdBy: adminId,
      title: data.title,
      description: data.description ?? null,
      enrollmentKey,
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { instructors: true, enrollments: true } },
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
    select: { id: true, name: true, email: true, npm: true },
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
