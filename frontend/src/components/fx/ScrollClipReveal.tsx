"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollClipRevealProps {
  children: ReactNode;
  className?: string;
  /** Inset percentage at the start (closed). Default 12 (12% inset on all sides). */
  startInset?: number;
  /** Inset percentage at the end (open). Default 0. */
  endInset?: number;
  /** Border radius (px) when fully open. Default 16. */
  endRadius?: number;
  /** Border radius (px) at start. Default 32. */
  startRadius?: number;
}

/**
 * Wraps content in a scroll-driven clip-path inset that opens
 * from `startInset` to `endInset` as the section moves through the viewport.
 * Honours prefers-reduced-motion (renders without clipping).
 */
export default function ScrollClipReveal({
  children,
  className,
  startInset = 12,
  endInset = 0,
  endRadius = 16,
  startRadius = 32,
}: ScrollClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const insetV = useTransform(scrollYProgress, [0, 0.5, 1], [startInset, endInset, endInset]);
  const insetH = useTransform(scrollYProgress, [0, 0.5, 1], [startInset, endInset, endInset]);
  const radius = useTransform(scrollYProgress, [0, 0.5, 1], [startRadius, endRadius, endRadius]);

  const clipPath = useMotionTemplate`inset(${insetV}% ${insetH}% ${insetV}% ${insetH}% round ${radius}px)`;

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={cn("relative", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{ clipPath, WebkitClipPath: clipPath }}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  );
}
