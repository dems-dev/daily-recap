import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { meditationSchema, serializeMeditation } from "@/lib/meditation";
import { dateKeyToDate } from "@/lib/date";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

  const logs = await prisma.meditationLog.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs: logs.map(serializeMeditation) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const json = await req.json();
    const data = meditationSchema.parse(json);

    const log = await prisma.meditationLog.create({
      data: {
        userId: session.user.id,
        type: data.type,
        duration: data.duration,
        notes: data.notes,
        date: dateKeyToDate(data.date),
      },
    });

    return NextResponse.json(serializeMeditation(log));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
