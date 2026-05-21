import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { createUserSchema, userFilterSchema } from "@/lib/schemas/user.schema";
import * as userService from "@/lib/services/user.service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const filterResult = userFilterSchema.safeParse({
    role: searchParams.get("role") || undefined,
    academicLevel: searchParams.get("academicLevel") || undefined,
    search: searchParams.get("search") || undefined,
  });

  if (!filterResult.success) {
    return NextResponse.json({ error: "Parameter filter tidak valid" }, { status: 400 });
  }

  const users = await userService.listUsers(filterResult.data);
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  try {
    const user = await userService.createUser(result.data);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
