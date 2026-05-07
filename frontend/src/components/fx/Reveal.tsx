"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const lineVariants: Variants = {
  hidden: { y: "110%" },
  visible: (i: number = 0) => ({
    y: "0%",
    transition: { duration: 1.0, ease: easeOutExpo, delay: i * 0.08 },
  }),
};

interface RevealLinesProps {
  lines: ReactNode[];
  className?: string;
  delayBase?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export function RevealLines({ lines, className, delayBase = 0, as = "h2" }: RevealLinesProps) {
  const Tag = as;
  return (
    <Tag className={className}>
      {lines.map((line, i) => (
        <span
          key={i}
          className="block overflow-hidden"
          style={{ paddingBottom: "0.05em", marginTop: i === 0 ? 0 : 0 }}
        >
          <motion.span
            className="block"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={i + delayBase}
            variants={lineVariants}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

export function Reveal({ children, delay = 0, y = 32, className, once = true }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.85, ease: easeOutExpo, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
