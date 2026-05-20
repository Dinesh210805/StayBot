"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const GRADIENT_ANGLES = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
} as const;

export type ProgressiveBlurDirection = keyof typeof GRADIENT_ANGLES;

interface ProgressiveBlurProps extends HTMLAttributes<HTMLDivElement> {
  direction?: ProgressiveBlurDirection;
  layers?: number;
  intensity?: number;
}

export default function ProgressiveBlur({
  direction = "bottom",
  layers = 6,
  intensity = 0.4,
  className,
  ...props
}: ProgressiveBlurProps) {
  const count = Math.max(layers, 2);
  const segment = 1 / (count + 1);
  const angle = GRADIENT_ANGLES[direction];

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => {
        const stops = [
          i * segment,
          (i + 1) * segment,
          (i + 2) * segment,
          (i + 3) * segment,
        ]
          .map(
            (pos, idx) =>
              `rgba(255,255,255,${idx === 1 || idx === 2 ? 1 : 0}) ${pos * 100}%`,
          )
          .join(",");
        const gradient = `linear-gradient(${angle}deg, ${stops})`;
        return (
          <div
            key={i}
            className="absolute inset-0 rounded-[inherit]"
            style={{
              maskImage: gradient,
              WebkitMaskImage: gradient,
              backdropFilter: `blur(${i * intensity}px)`,
              WebkitBackdropFilter: `blur(${i * intensity}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
