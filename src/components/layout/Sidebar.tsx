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
      { key: "goals", href: "/productivity/goals", icon: Target, ready: true },
      { key: "pomodoro", href: "/productivity/pomodoro", icon: Timer, ready: true },
    ],
  },
  {
    key: "mind",
    items: [
      { key: "journal", href: "/mind/journal", icon: BookHeart, ready: true },
      { key: "meditation", href: "/mind/meditation", icon: Smile, ready: true },
    ],
  },
  {
    key: "health",
    items: [
      { key: "workout", href: "/health/workout", icon: Dumbbell, ready: true },
      { key: "nutrition", href: "/health/nutrition", icon: Apple, ready: true },
      { key: "sleep", href: "/health/sleep", icon: Moon, ready: true },
      { key: "body", href: "/health/body", icon: Scale, ready: true },
    ],
  },
  {
    key: "learning",
    items: [
      { key: "books", href: "/learning/books", icon: BookOpen, ready: true },
      { key: "skills", href: "/learning/skills", icon: GraduationCap, ready: true },
      { key: "til", href: "/learning/til", icon: Lightbulb, ready: true },
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
    <div className="flex h-full flex-col bg-background/60 backdrop-blur-md">
      <div className="flex h-16 items-center border-b border-border/50 px-6 gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="font-bold text-lg tracking-tight text-gradient">Daily Recap</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        {VISIBLE_NAV.map((group) => (
          <div key={group.key} className="mb-8">
            <h4 className="mb-3 px-3 text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">
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
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform duration-200", 
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                    )} />
                    {t(item.key === "finance" ? "transactions" : item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3 mb-4 rounded-xl p-2 hover:bg-muted/50 transition-colors">
          <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary">{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold truncate">{session?.user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
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
          render={<Button variant="outline" size="icon" className="md:hidden fixed top-3 left-3 z-40 bg-background/80 backdrop-blur-sm border-border/50 shadow-sm rounded-xl" />}
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 border-r-0 shadow-2xl glass">
          <SidebarContent onNavigate={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-[280px] flex-col border-r border-border/50 bg-background/40 backdrop-blur-xl">
        <SidebarContent />
      </div>
    </>
  );
}
