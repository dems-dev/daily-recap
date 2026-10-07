import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

/** Send a test notification to the signed-in user's devices. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!pushConfigured()) return badRequest("Push is not configured on this server");
    if (!(await rateLimit(`push-test:${user.id}`, 5, 10 * 60 * 1000)).ok) {
      return NextResponse.json({ message: "Too many test notifications" }, { status: 429 });
    }

    const isId = user.locale !== "en";
    const result = await sendPushToUser(user.id, {
      title: "Daily Recap",
      body: isId ? "Notifikasi berhasil diaktifkan" : "Notifications are working",
      url: "/settings",
      tag: "test",
    });
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error);
  }
}
