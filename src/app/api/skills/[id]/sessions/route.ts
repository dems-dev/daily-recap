import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { skillSessionSchema, type SkillSessionDTO } from "@/lib/skills";
import { dateKeyToDate, dateToKey } from "@/lib/date";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  
  // verify skill ownership
  const skill = await prisma.skill.findUnique({ where: { id, userId: session.user.id } });
  if (!skill) return new NextResponse("Not Found", { status: 404 });

  try {
    const json = await req.json();
    const data = skillSessionSchema.parse(json);

    const log = await prisma.skillSession.create({
      data: {
        skillId: id,
        duration: data.duration,
        notes: data.notes,
        date: dateKeyToDate(data.date),
      },
    });

    const dto: SkillSessionDTO = {
      id: log.id,
      skillId: log.skillId,
      duration: log.duration,
      notes: log.notes,
      date: dateToKey(log.date),
    };

    return NextResponse.json(dto);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
