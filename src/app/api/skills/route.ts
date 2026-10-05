import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { skillSchema, type SkillDTO } from "@/lib/skills";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const skills = await prisma.skill.findMany({
    where: { userId: session.user.id },
    include: { sessions: true },
    orderBy: { createdAt: "desc" },
  });

  const logs: SkillDTO[] = skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    level: s.level as SkillDTO["level"],
    totalDuration: s.sessions.reduce((acc, sess) => acc + sess.duration, 0),
  }));

  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const json = await req.json();
    const data = skillSchema.parse(json);

    const skill = await prisma.skill.create({
      data: {
        userId: session.user.id,
        name: data.name,
        category: data.category,
        level: data.level,
      },
    });

    const dto: SkillDTO = {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      level: skill.level as SkillDTO["level"],
      totalDuration: 0,
    };

    return NextResponse.json(dto);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
