import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { buildDashboard } from "@/lib/dashboard-server";
import { todayKey } from "@/lib/date";
import { materializeRecurring } from "@/lib/recurring-server";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "@/i18n/routing";

/**
 * Rendered on the server, so the cards arrive with the document instead of
 * waiting for the bundle to load and then issuing a second round trip for
 * /api/dashboard. The skeleton below is the streamed shell; failures are
 * handled by the segment's error.tsx.
 */
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent locale={locale} />
    </Suspense>
  );
}

async function DashboardContent({ locale }: { locale: string }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  await materializeRecurring(user.id, todayKey(user.timezone));
  const data = await buildDashboard(user);

  return <DashboardView data={data} firstName={user.name?.split(" ")[0] ?? ""} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
