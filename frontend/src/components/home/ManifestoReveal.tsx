"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

const MANIFESTO =
  "We don't list rooms. We compose arrivals — slow, lit, and yours before you knock.";

interface WordProps {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  italic?: boolean;
}

function Word({ word, progress, range, italic }: WordProps) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <span className="relative inline-block mx-[0.18em] my-[0.08em]">
      <span aria-hidden className="opacity-[0.14] select-none">
        {word}
      </span>
      <motion.span
        style={{ opacity }}
        className={`absolute inset-0 text-[var(--ink)] ${italic ? "italic-display" : ""}`}
      >
        {word}
      </motion.span>
    </span>
  );
}

export default function ManifestoReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.15"],
  });

  const words = MANIFESTO.split(" ");
  const italicTargets = new Set(["compose", "arrivals"]);

  // Numeral watermark drift
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

  return (
    <section
      ref={ref}
      className="relative w-full min-h-[100svh] flex items-center bg-[var(--paper)] py-32 md:py-44 px-6 md:px-12 overflow-hidden"
    >
      <div className="absolute inset-0 grid-lines opacity-[0.05] pointer-events-none" />

      {/* Rotated ochre numeral watermark */}
      <motion.span
        aria-hidden
        style={{ y: watermarkY, color: "var(--ochre)" }}
        className="absolute -left-[2%] top-1/2 -translate-y-1/2 font-display text-[clamp(14rem,28vw,32rem)] leading-none tracking-[-0.04em] italic-display opacity-[0.08] pointer-events-none select-none"
      >
        I.
      </motion.span>

      <div className="relative max-w-[1500px] mx-auto">
        <div className="mb-14 md:mb-20 flex items-baseline justify-between">
          <p className="eyebrow-muted">/01 · Manifesto</p>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-faint)]">
            Chapter I
          </p>
        </div>

        <p className="flex flex-wrap font-display leading-[0.95] tracking-[-0.02em] text-[clamp(2.4rem,6vw,6.5rem)] text-[var(--ink-faint)] max-w-[18ch]">
          {words.map((word, i) => {
            const start = i / words.length;
            const end = start + 1 / words.length;
            const clean = word.replace(/[.,—]/g, "").toLowerCase();
            return (
              <Word
                key={i}
                word={word}
                progress={scrollYProgress}
                range={[start, Math.min(1, end + 0.05)]}
                italic={italicTargets.has(clean)}
              />
            );
          })}
        </p>

        <div className="mt-20 md:mt-28 flex items-center gap-4 text-[var(--ink-muted)]">
          <span className="h-px w-12 bg-[var(--ink-muted)]/40" />
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase">— The Editors</p>
        </div>
      </div>
    </section>
  );
}
