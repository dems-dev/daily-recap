"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import * as React from "react";

const EASE = [0.22, 1, 0.36, 1] as const;
// A gentle spring with a touch of overshoot — reads as "lively" without bouncing.
const SPRING = { type: "spring", stiffness: 260, damping: 22, mass: 0.9 } as const;

// framer-motion's children type includes MotionValue; narrow it back to ReactNode
// so these wrappers can also render a plain <div> fallback.
type DivProps = Omit<HTMLMotionProps<"div">, "children"> & { children?: React.ReactNode };

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

/**
 * Fades + rises a single element into view on mount.
 * Falls back to an instant, static render when the user prefers reduced motion.
 */
export function FadeIn({
  delay = 0,
  y = 24,
  className,
  children,
  ...props
}: DivProps & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Container that reveals its <StaggerItem> children one after another. */
export function Stagger({
  className,
  children,
  stagger = 0.09,
  delayChildren = 0.05,
  ...props
}: DivProps & { stagger?: number; delayChildren?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren } } }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** A single item inside <Stagger>. */
export function StaggerItem({ className, children, ...props }: DivProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export { EASE, SPRING };
