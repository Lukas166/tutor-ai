import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { CreateUserInput, UpdateUserInput, UserFilter } from "@/lib/schemas/user.schema";

export async function listUsers(filter: UserFilter) {
  const where: Record<string, unknown> = {};

  if (filter.role) {
    where.role = filter.role;
  }
  if (filter.academicLevel) {
    where.academicLevel = filter.academicLevel;
  }
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: "insensitive" } },
      { email: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      academicLevel: true,
      npm: true,
      major: true,
      faculty: true,
      bio: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      academicLevel: true,
      npm: true,
      major: true,
      faculty: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(data: CreateUserInput) {
  // Use Better Auth to create user with hashed password
  const response = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
    },
  });

  if (!response?.user) {
    throw new Error("Gagal membuat akun pengguna");
  }

  // Update custom fields
  const user = await prisma.user.update({
    where: { id: response.user.id },
    data: {
      role: data.role,
      academicLevel: data.academicLevel ?? null,
      npm: data.npm ?? null,
      major: data.major ?? null,
      faculty: data.faculty ?? null,
      bio: data.bio ?? null,
    },
  });

  return user;
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User tidak ditemukan");
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.role && { role: data.role }),
      academicLevel: data.academicLevel !== undefined ? data.academicLevel : undefined,
      npm: data.npm !== undefined ? data.npm : undefined,
      major: data.major !== undefined ? data.major : undefined,
      faculty: data.faculty !== undefined ? data.faculty : undefined,
      bio: data.bio !== undefined ? data.bio : undefined,
    },
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User tidak ditemukan");
  }

  await prisma.user.delete({ where: { id } });
  return { success: true };
}

export async function getUserStats() {
  const [total, admin, dosen, mahasiswa] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { role: "dosen" } }),
    prisma.user.count({ where: { role: "mahasiswa" } }),
  ]);

  return { total, admin, dosen, mahasiswa };
}
