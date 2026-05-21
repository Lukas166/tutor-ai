import { z } from "zod/v4";

const ROLES = ["admin", "dosen", "mahasiswa"] as const;
const ACADEMIC_LEVELS = ["S1", "S2", "S3"] as const;

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    role: z.enum(ROLES),
    academicLevel: z.enum(ACADEMIC_LEVELS).nullable().optional(),
    npm: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    faculty: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "mahasiswa") {
        return !!data.npm && !!data.academicLevel;
      }
      return true;
    },
    { message: "Mahasiswa wajib memiliki NPM dan jenjang pendidikan" }
  )
  .refine(
    (data) => {
      if (data.role !== "mahasiswa") {
        return !data.npm && !data.academicLevel;
      }
      return true;
    },
    { message: "Admin/Dosen tidak boleh memiliki NPM dan jenjang pendidikan" }
  );

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter").optional(),
    email: z.email("Email tidak valid").optional(),
    role: z.enum(ROLES).optional(),
    academicLevel: z.enum(ACADEMIC_LEVELS).nullable().optional(),
    npm: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    faculty: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "mahasiswa") {
        return data.npm !== null && data.academicLevel !== null;
      }
      return true;
    },
    { message: "Mahasiswa wajib memiliki NPM dan jenjang pendidikan" }
  )
  .refine(
    (data) => {
      if (data.role && data.role !== "mahasiswa") {
        return !data.npm && !data.academicLevel;
      }
      return true;
    },
    { message: "Admin/Dosen tidak boleh memiliki NPM dan jenjang pendidikan" }
  );

export const userFilterSchema = z.object({
  role: z.enum(ROLES).optional(),
  academicLevel: z.enum(ACADEMIC_LEVELS).optional(),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFilter = z.infer<typeof userFilterSchema>;
