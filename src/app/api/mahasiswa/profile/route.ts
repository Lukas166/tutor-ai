import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireMahasiswa } from "@/lib/api-utils";
import prisma from "@/lib/prisma";

const updateProfileSchema = z.object({
  bio: z.string().max(500, "Bio maksimal 500 karakter").nullable(),
});

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireMahasiswa(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: { bio: parsed.data.bio?.trim() || null },
    select: { bio: true },
  });

  return NextResponse.json(user);
}
