import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { DataVersionProvider } from "@/hooks/use-json";
import { QuickAddProvider } from "@/components/quick-add/QuickAddProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataVersionProvider>
      <QuickAddProvider>
        <div className="app-shell flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            {/* pb-24 on mobile clears the fixed BottomNav */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          <BottomNav />
        </div>
      </QuickAddProvider>
    </DataVersionProvider>
  );
}
