import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { readJson, serverError, validationError } from "@/lib/api";
import { registerSchema } from "@/lib/auth-schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_REGISTRATIONS_PER_IP = 5;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`register:ip:${clientIp(req.headers)}`, MAX_REGISTRATIONS_PER_IP, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many attempts", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const parsed = registerSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use", code: "email_taken" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 10) },
    });

    return NextResponse.json(
      { message: "User registered successfully", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error);
  }
}
