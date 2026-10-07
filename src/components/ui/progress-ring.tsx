"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

/**
 * Circular progress indicator. Designed to sit on the hero gradient, so it
 * defaults to light strokes; override via `trackClass` / `progressClass`.
 */
export function ProgressRing({
  value,
  size = 136,
  stroke = 12,
  trackClass = "text-white/25",
  progressClass = "text-white",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  trackClass?: string;
  progressClass?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
          stroke="currentColor"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={progressClass}
          stroke="currentColor"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
