"use client";

import { animate, useReducedMotion } from "framer-motion";
import * as React from "react";

/**
 * Animates a number from 0 → `value` on mount (and on subsequent value changes).
 * Pass `format` to render money, ratios, etc. Respects reduced-motion by
 * rendering the final value immediately.
 */
export function CountUp({
  value,
  format,
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    if (reduce) return; // render `value` directly below - no state churn
    const controls = animate(fromRef.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, reduce, duration]);

  const current = reduce ? value : display;
  const text = format ? format(current) : Math.round(current).toLocaleString();
  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
