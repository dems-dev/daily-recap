"use client";

import { useCallback, useEffect, useState } from "react";
import { sendJson } from "@/hooks/use-json";

export type PushStatus = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  // Push needs the service worker even in development (where it isn't auto-registered).
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** This browser's web-push state, plus subscribe/unsubscribe that sync with the server. */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>("loading");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    setStatus(sub ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser push state on mount
    refresh().catch(() => setStatus("unsupported"));
  }, [refresh]);

  const subscribe = useCallback(async () => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) throw new Error("Push is not configured");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await refresh();
      return false;
    }
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
    await sendJson("/api/push/subscribe", "POST", sub.toJSON());
    setStatus("subscribed");
    return true;
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await sendJson("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setStatus("unsubscribed");
  }, []);

  return { status, subscribe, unsubscribe };
}
