import webpush from "web-push";
import prisma from "@/lib/prisma";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured: boolean | null = null;

/** True when VAPID keys are set; push features are disabled otherwise. */
export function pushConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
  return (configured = true);
}

/** Send to every device of a user; drops subscriptions the push service says are gone. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, removed: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error("push failed", status, (err as Error).message);
      }
    })
  );

  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  return { sent, removed: gone.length };
}
