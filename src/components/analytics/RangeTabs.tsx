"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/routing";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics";

/**
 * Range switcher. The range lives in `?days=`, so the server renders the
 * matching data - no client refetch. `useTransition` keeps the current charts
 * on screen while the next range streams in, instead of flashing a skeleton.
 */
export function RangeTabs({ days }: { days: AnalyticsRange }) {
  const t = useTranslations("Analytics");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <Tabs
      value={String(days)}
      onValueChange={(value) =>
        startTransition(() => router.replace({ pathname, query: { days: String(value) } }))
      }
      className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}
    >
      <TabsList>
        {ANALYTICS_RANGES.map((d) => (
          <TabsTrigger key={d} value={String(d)}>
            {t("lastDays", { days: d })}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
