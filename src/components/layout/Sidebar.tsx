"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { 
  Sparkles, 
  LayoutDashboard, 
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
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Sidebar() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const menuGroups = [
    {
      label: t("overview"),
      items: [
        { name: t("dashboard"), href: "/", icon: LayoutDashboard },
      ],
    },
    {
      label: t("finance"),
      items: [
        { name: t("finance"), href: "/finance", icon: Wallet },
      ],
    },
    {
      label: t("health"),
      items: [
        { name: t("workout"), href: "/health/workout", icon: Dumbbell },
        { name: t("nutrition"), href: "/health/nutrition", icon: Apple },
        { name: t("sleep"), href: "/health/sleep", icon: Moon },
        { name: t("body"), href: "/health/body", icon: Scale },
      ],
    },
    {
      label: t("mind"),
      items: [
        { name: t("journal"), href: "/mind/journal", icon: BookHeart },
        { name: t("meditation"), href: "/mind/meditation", icon: Smile },
      ],
    },
    {
      label: t("productivity"),
      items: [
        { name: t("todos"), href: "/productivity/todos", icon: CheckSquare },
        { name: t("habits"), href: "/productivity/habits", icon: ListTodo },
        { name: t("goals"), href: "/productivity/goals", icon: Target },
        { name: t("pomodoro"), href: "/productivity/pomodoro", icon: Timer },
      ],
    },
    {
      label: t("learning"),
      items: [
        { name: t("books"), href: "/learning/books", icon: BookOpen },
        { name: t("skills"), href: "/learning/skills", icon: GraduationCap },
        { name: t("til"), href: "/learning/til", icon: Lightbulb },
      ],
    },
    {
      label: t("insights"),
      items: [
        { name: t("analytics"), href: "/analytics", icon: LineChart },
      ],
    },
    {
      label: t("system"),
      items: [
        { name: t("settings"), href: "/settings", icon: Settings },
      ],
    },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">Daily Recap</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {menuGroups.map((group, i) => (
          <div key={i} className="mb-6">
            <h4 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {group.label}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{session?.user?.name}</span>
            <span className="text-xs text-muted-foreground truncate w-32">{session?.user?.email}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-[280px] flex-col border-r bg-card">
        <SidebarContent />
      </div>
    </>
  );
}
