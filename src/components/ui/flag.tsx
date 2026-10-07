import * as React from "react";
import { cn } from "cn";

/**
 * Tiny rounded flag SVGs - consistent everywhere (OS flag emoji don't render on
 * Windows). Just the two locales the app ships with.
 */
export function Flag({
  country,
  className,
  width = 20,
}: {
  country: "id" | "gb";
  className?: string;
  width?: number;
}) {
  const height = Math.round((width * 3) / 4);
  const cls = cn("inline-block shrink-0 rounded-[3px] align-middle ring-1 ring-black/10", className);

  if (country === "id") {
    return (
      <svg viewBox="0 0 16 12" width={width} height={height} className={cls} role="img" aria-label="Indonesia">
        <rect width="16" height="6" fill="#e60026" />
        <rect y="6" width="16" height="6" fill="#ffffff" />
      </svg>
    );
  }

  // Simplified Union Jack.
  return (
    <svg viewBox="0 0 16 12" width={width} height={height} className={cls} role="img" aria-label="United Kingdom">
      <rect width="16" height="12" fill="#012169" />
      <path d="M0 0 L16 12 M16 0 L0 12" stroke="#ffffff" strokeWidth="2.4" />
      <path d="M0 0 L16 12 M16 0 L0 12" stroke="#c8102e" strokeWidth="1.1" />
      <path d="M8 0 V12 M0 6 H16" stroke="#ffffff" strokeWidth="3.2" />
      <path d="M8 0 V12 M0 6 H16" stroke="#c8102e" strokeWidth="1.8" />
    </svg>
  );
}
