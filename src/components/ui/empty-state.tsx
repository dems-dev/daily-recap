import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/** Friendly placeholder for empty lists - icon chip + message + optional action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-10 text-center",
        className
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
