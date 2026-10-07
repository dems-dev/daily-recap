import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { skillPatchSchema } from "@/lib/skills";

/** PATCH /api/skills/[id] - rename a skill, change its category or level. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const parsed = skillPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { count } = await prisma.skill.updateMany({
      where: { id, userId: user.id },
      data: parsed.data,
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/skills/[id] - remove a skill and its sessions (cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const { count } = await prisma.skill.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
