"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "@/i18n/routing";

/**
 * Gives every dashboard route a consistent fade-rise entrance on navigation.
 * One place → applies to all pages (the dashboard adds its own inner stagger on top).
 *
 * No AnimatePresence here on purpose: `mode="wait"` held the next page's mount
 * back until the exit animation had finished, which delayed that page's data
 * fetch by the full animation duration on every navigation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
