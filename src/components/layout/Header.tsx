"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";

export function Header() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  
  const today = new Date();
  const dateLocale = locale === 'id' ? id : enUS;
  const formattedDate = format(today, "EEEE, d MMMM yyyy", { locale: dateLocale });

  const switchLocale = (newLocale: "id" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6 bg-card">
      <div className="flex items-center gap-4">
        {/* Placeholder for Breadcrumbs or Date */}
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
          {formattedDate}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
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
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
