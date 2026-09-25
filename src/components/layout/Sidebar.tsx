"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Sparkles,
  Bot,
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  Dumbbell,
  Apple,
  Moon,
  Scale,
  BookHeart,
  Smile,
  CheckSquare,
  ListTodo,
  Target,
  Timer,
  BookOpen,
  GraduationCap,
  Lightbulb,
  LineChart,
  Settings,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

type NavItem = { key: string; href: string; icon: LucideIcon; ready: boolean };
type NavGroup = { key: string; items: NavItem[] };

// Modules with `ready: false` are not built yet; their pages exist but stay out of
// the menu until they work. Flip the flag when a module is finished.
const NAV: NavGroup[] = [
  {
    key: "overview",
    items: [
      { key: "dashboard", href: "/", icon: LayoutDashboard, ready: true },
      { key: "recap", href: "/recap", icon: CalendarCheck, ready: true },
    ],
  },
  { key: "finance", items: [{ key: "finance", href: "/finance", icon: Wallet, ready: true }] },
  {
    key: "productivity",
    items: [
      { key: "todos", href: "/productivity/todos", icon: CheckSquare, ready: true },
      { key: "habits", href: "/productivity/habits", icon: ListTodo, ready: true },
      { key: "goals", href: "/productivity/goals", icon: Target, ready: false },
      { key: "pomodoro", href: "/productivity/pomodoro", icon: Timer, ready: false },
    ],
  },
  {
    key: "mind",
    items: [
      { key: "journal", href: "/mind/journal", icon: BookHeart, ready: true },
      { key: "meditation", href: "/mind/meditation", icon: Smile, ready: false },
    ],
  },
  {
    key: "health",
    items: [
      { key: "workout", href: "/health/workout", icon: Dumbbell, ready: false },
      { key: "nutrition", href: "/health/nutrition", icon: Apple, ready: false },
      { key: "sleep", href: "/health/sleep", icon: Moon, ready: true },
      { key: "body", href: "/health/body", icon: Scale, ready: false },
    ],
  },
  {
    key: "learning",
    items: [
      { key: "books", href: "/learning/books", icon: BookOpen, ready: false },
      { key: "skills", href: "/learning/skills", icon: GraduationCap, ready: false },
      { key: "til", href: "/learning/til", icon: Lightbulb, ready: false },
    ],
  },
  {
    key: "insights",
    items: [
      { key: "assistant", href: "/assistant", icon: Bot, ready: true },
      { key: "analytics", href: "/analytics", icon: LineChart, ready: true },
    ],
  },
  { key: "system", items: [{ key: "settings", href: "/settings", icon: Settings, ready: true }] },
];

const VISIBLE_NAV = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.ready) })).filter(
  (g) => g.items.length > 0
);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">Daily Recap</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {VISIBLE_NAV.map((group) => (
          <div key={group.key} className="mb-6">
            <h4 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {t(group.key)}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.key === "finance" ? "transactions" : item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium truncate">{session?.user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ redirectTo: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const t = useTranslations("Navigation");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden fixed top-2.5 left-2 z-40" />}
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent onNavigate={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-[280px] flex-col border-r bg-card">
        <SidebarContent />
      </div>
    </>
  );
}
