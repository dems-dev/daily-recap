import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { bookSchema, serializeBook } from "@/lib/books";

/** GET /api/books?status=reading|want-to-read|finished&page=1&limit=20 — list books. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where: {
          userId: user.id,
          ...(status && { status }),
        },
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.book.count({
        where: {
          userId: user.id,
          ...(status && { status }),
        }
      })
    ]);

    return NextResponse.json({
      books: books.map(serializeBook),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/books — add a new book. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = bookSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { title, author, totalPages, status } = parsed.data;
    const now = new Date();

    const book = await prisma.book.create({
      data: {
        userId: user.id,
        title,
        author: author ?? null,
        totalPages: totalPages ?? null,
        status,
        startDate: status === "reading" ? now : null,
      },
    });

    return NextResponse.json({ id: book.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
