"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryPoint } from "@/lib/exercises";

/**
 * recharts is only needed once the records are on screen, so it loads after
 * first paint. The dynamic() call has to live in a Client Component for code
 * splitting to kick in (see next/dist/docs: "Importing Client Components").
 */
const ExerciseProgressChart = dynamic(() => import("./ExerciseProgressChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-64" />,
});

export function ExerciseProgressSection({
  points,
  bodyweight,
}: {
  points: HistoryPoint[];
  bodyweight: boolean;
}) {
  return <ExerciseProgressChart points={points} bodyweight={bodyweight} />;
}
