"use client";

import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}

export default function Marquee({
  children,
  duration = 40,
  reverse = false,
  className = "",
}: MarqueeProps) {
  return (
    <div className={`relative flex overflow-hidden ${className}`} aria-hidden>
      <div
        className="flex shrink-0 items-center gap-12 pr-12"
        style={{
          animation: `scrollMarquee ${duration}s linear infinite ${reverse ? "reverse" : ""}`,
        }}
      >
        {children}
      </div>
      <div
        className="flex shrink-0 items-center gap-12 pr-12"
        style={{
          animation: `scrollMarquee ${duration}s linear infinite ${reverse ? "reverse" : ""}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
