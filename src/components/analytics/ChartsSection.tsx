"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsChartData } from "./shared";

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  );
}

/**
 * recharts is ~45 KB gzipped and only needed once the insights are on screen,
 * so it loads after first paint instead of blocking the route bundle.
 * The dynamic() call has to live in a Client Component for code splitting to
 * kick in (see next/dist/docs: "Importing Client Components").
 */
const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
});

export function ChartsSection({ data }: { data: AnalyticsChartData }) {
  return <AnalyticsCharts data={data} />;
}
