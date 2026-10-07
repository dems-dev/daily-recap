import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, todayKey } from "@/lib/date";
import { tilSchema, serializeTil } from "@/lib/til";

/** GET /api/til - list TIL notes, newest first. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    // `tags` is a JSON column, so a tag filter is applied in memory after fetching.
    const notes = await prisma.tilNote.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: tag ? 200 : limit,
    });

    let serialized = notes.map(serializeTil);
    if (tag) serialized = serialized.filter((n) => n.tags.includes(tag)).slice(0, limit);

    return NextResponse.json({
      today: todayKey(user.timezone),
      notes: serialized,
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/til - create a TIL note. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = tilSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { content, tags, source, date } = parsed.data;
    const note = await prisma.tilNote.create({
      data: {
        userId: user.id,
        content,
        tags: tags ?? [],
        source: source ?? null,
        date: dateKeyToDate(date),
      },
    });

    return NextResponse.json({ id: note.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
