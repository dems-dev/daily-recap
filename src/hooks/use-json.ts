"use client";

import { useCallback, useEffect, useState } from "react";

type Result<T> = { key: string | null; data: T | null; error: string | null };

/**
 * GET a JSON endpoint. Refetches when `url` or `refreshKey` changes;
 * pass `url = null` to wait. Keeps the previous data while refetching.
 */
export function useJson<T>(url: string | null, refreshKey: unknown = 0) {
  const [reloadTick, setReloadTick] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: null, data: null, error: null });
  const key = url === null ? null : `${url}#${String(refreshKey)}#${reloadTick}`;

  useEffect(() => {
    if (!url || key === null) return;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText);
        return res.json() as Promise<T>;
      })
      .then((data) => setResult({ key, data, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult((prev) => ({ key, data: prev.data, error: err instanceof Error ? err.message : String(err) }));
      });

    return () => controller.abort();
  }, [url, key]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  return {
    data: result.data,
    error: result.key === key ? result.error : null,
    loading: key !== null && result.key !== key,
    reload,
  };
}

/** Send a JSON mutation; throws with the server message on failure. */
export async function sendJson(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message ?? res.statusText);
  }
  return res.status === 204 ? null : res.json();
}
