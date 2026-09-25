import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { pushConfigured } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

/** Save this browser's push subscription for the signed-in user. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!pushConfigured()) return badRequest("Push is not configured on this server");

    const parsed = subscriptionSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { endpoint, keys } = parsed.data;

    // An endpoint belongs to one browser; if someone else signed in on it before, it moves to this user.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = z.object({ endpoint: z.string().url() }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
