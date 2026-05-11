import { z } from "zod/v4";

export const createCourseSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const assignInstructorSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AssignInstructorInput = z.infer<typeof assignInstructorSchema>;
