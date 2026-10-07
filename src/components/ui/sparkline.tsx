"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";

/**
 * Tiny inline trend line for a stat card. Single series, no axes - a glanceable
 * micro-trend; the card itself links to the full, interactive view. Colour comes
 * from the parent via `currentColor` (set `text-finance` etc. on a wrapper).
 *
 * On mount the line "draws" left → right via a clip-path wipe (distortion-free,
 * unlike animating a stretched dash array). Static when reduced motion is on.
 */
export function Sparkline({
  values,
  className,
  height = 36,
  strokeWidth = 2,
  delay = 0.25,
}: {
  values: number[];
  className?: string;
  height?: number;
  strokeWidth?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (!values || values.length < 2) return null;

  const W = 100;
  const H = height;
  const pad = strokeWidth;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => {
    if (span === 0) return H / 2;
    const t = (v - min) / span;
    return H - pad - t * (H - pad * 2);
  };

  const linePts = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  const line = `M${linePts.join(" L")}`;
  const area = `${line} L${W},${H} L0,${H} Z`;

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      style={{ height, display: "block" }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill="currentColor" opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );

  if (reduce) return svg;

  return (
    <motion.div
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {svg}
    </motion.div>
  );
}
