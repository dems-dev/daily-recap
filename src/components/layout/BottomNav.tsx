"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LayoutDashboard, Wallet, CheckSquare, Menu, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/Sidebar";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";

type Item = { key: string; href: string; icon: LucideIcon };

const LINKS: Item[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "transactions", href: "/finance", icon: Wallet },
  { key: "todos", href: "/productivity/todos", icon: CheckSquare },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const t = useTranslations("Navigation");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-5" />
      <span className="truncate">{t(item.key)}</span>
    </Link>
  );
}

export function BottomNav() {
  const t = useTranslations("Navigation");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { openPalette } = useQuickAdd();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="flex items-end justify-around gap-1 border-t border-border/60 bg-background/85 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        {LINKS.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {/* Center FAB — quick add */}
        <button
          type="button"
          onClick={() => openPalette()}
          aria-label={tHeader("quickAdd")}
          className="-mt-5 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
        >
          <Zap className="size-5" />
        </button>

        {LINKS.slice(2).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {/* More — full menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              />
            }
            aria-label={t("openMenu")}
          >
            <Menu className="size-5" />
            <span>{t("more")}</span>
          </SheetTrigger>
          <SheetContent side="left" className="glass w-[280px] border-r-0 p-0 shadow-2xl">
            <SidebarContent onNavigate={() => setMoreOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
