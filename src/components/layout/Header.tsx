"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useDateLocale } from "@/components/common";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";

export function Header() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const dateLocale = useDateLocale();
  const { openPalette } = useQuickAdd();

  const formattedDate = format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocale });

  const switchLocale = (newLocale: "id" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-card pl-14 pr-4 md:pl-4 lg:px-6">
      <span className="hidden text-sm font-medium text-muted-foreground sm:inline-block" suppressHydrationWarning>
        {formattedDate}
      </span>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => openPalette()}>
          <Zap className="h-4 w-4" />
          <span>{t("quickAdd")}</span>
          <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />} aria-label={t("language")}>
            <Globe className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => switchLocale("id")} className={locale === "id" ? "bg-muted" : ""}>
              Indonesia 🇮🇩
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchLocale("en")} className={locale === "en" ? "bg-muted" : ""}>
              English 🇬🇧
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />} aria-label={t("theme")}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>{t("light")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>{t("dark")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>{t("system")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
