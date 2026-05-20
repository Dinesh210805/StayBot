"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import type { Destination } from "@/lib/destinations";

interface AtlasShowcaseProps {
  destinations: Destination[];
}

export default function AtlasShowcase({ destinations }: AtlasShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef });

  const n = destinations.length;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setActiveIdx(i);
  });

  const activeAccent = destinations[activeIdx]?.accent ?? "var(--ochre)";
  const sectionHeight = `${n * 100}vh`;

  if (prefersReducedMotion) {
    return (
      <section className="relative bg-[var(--ink)] py-24 px-6 md:px-12">
        <div className="max-w-[1500px] mx-auto mb-16">
          <p className="eyebrow-muted text-[var(--paper)]/50 mb-6">/02 · The Atlas</p>
          <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em] text-[var(--paper)] max-w-[20ch]">
            Four cities. One concierge. <em className="italic-display">A thousand mornings</em>.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-[1500px] mx-auto">
          {destinations.map((d, i) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="group relative aspect-[4/5] rounded-lg overflow-hidden"
            >
              <Image src={d.hero} alt={d.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p className="font-mono text-[10px] tracking-[0.32em] uppercase mb-2" style={{ color: d.accent }}>{d.tagline}</p>
                <h3 className="font-display text-3xl md:text-4xl leading-[0.95]">{d.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: sectionHeight }}
    >
      {/* Sticky fullscreen container */}
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[var(--ink)]">

        {/* Stacked destination layers */}
        {destinations.map((d, i) => (
          <DestinationLayer
            key={d.slug}
            destination={d}
            index={i}
            total={n}
            progress={scrollYProgress}
          />
        ))}

        {/* HUD overlay — always on top */}
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 md:p-10">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">/02 · The Atlas</p>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">
              <span>{String(activeIdx + 1).padStart(2, "0")}</span>
              <span>/</span>
              <span>{String(n).padStart(2, "0")}</span>
            </div>
          </div>

          {/* Bottom progress dots */}
          <div className="flex items-center justify-center gap-3">
            {destinations.map((d, i) => (
              <motion.span
                key={d.slug}
                className="block rounded-full transition-all duration-500"
                style={{
                  background: i === activeIdx ? d.accent : "rgba(255,255,255,0.25)",
                  width: i === activeIdx ? "28px" : "6px",
                  height: "6px",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface LayerProps {
  destination: Destination;
  index: number;
  total: number;
  progress: MotionValue<number>;
}

function DestinationLayer({ destination: d, index, total, progress }: LayerProps) {
  const n = total;

  // Each destination occupies scroll range [index/n, (index+1)/n]
  // Transition in: [(index - 0.15)/n, index/n]
  // Fully present: [index/n, (index + 0.85)/n]
  // Transition out: [(index + 0.85)/n, (index + 1)/n]

  const inStart = Math.max(0, (index - 0.2) / n);
  const inEnd = index / n;
  const outStart = (index + 0.8) / n;
  const outEnd = Math.min(1, (index + 1) / n);

  // First card is always visible at start
  const opacity = useTransform(
    progress,
    index === 0
      ? [0, outStart, outEnd]
      : [inStart, inEnd, outStart, outEnd],
    index === 0
      ? [1, 1, 0]
      : [0, 1, 1, 0]
  );

  // Subtle zoom: new card starts slightly zoomed in and settles; exits zooming out
  const scale = useTransform(
    progress,
    index === 0
      ? [0, outStart, outEnd]
      : [inStart, inEnd, outStart, outEnd],
    index === 0
      ? [1, 1.02, 1.06]
      : [1.06, 1, 1.02, 1.08]
  );

  // Text slides up on enter
  const textY = useTransform(
    progress,
    [inStart, inEnd, outStart],
    [24, 0, -16]
  );

  const textOpacity = useTransform(
    progress,
    index === 0
      ? [0, 0.01, outStart, outEnd]
      : [inStart, inEnd, outStart, outEnd],
    index === 0
      ? [1, 1, 1, 0]
      : [0, 1, 1, 0]
  );

  return (
    <motion.div
      className="absolute inset-0"
      style={{ opacity, zIndex: index + 1 }}
    >
      {/* Image with subtle scale */}
      <motion.div className="absolute inset-0" style={{ scale }}>
        <Image
          src={d.hero}
          alt={d.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority={index === 0}
        />
        {/* Gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
        {/* Grain */}
        <div className="absolute inset-0 img-grain opacity-40" />
      </motion.div>

      {/* Text content */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-auto pb-20 md:pb-24 px-6 md:px-12"
        style={{ y: textY, opacity: textOpacity }}
      >
        <div className="max-w-[900px]">
          {/* Coordinate + tagline */}
          <div className="flex items-center gap-4 mb-4 font-mono text-[10px] tracking-[0.32em] uppercase">
            <span style={{ color: d.accent }}>{d.tagline}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">{d.coordinate}</span>
          </div>

          {/* City name */}
          <h2 className="font-display text-[clamp(3.5rem,10vw,9rem)] leading-[0.88] tracking-[-0.03em] text-white">
            {d.name}
          </h2>

          {/* Native name */}
          <p
            className="font-display italic text-[clamp(1.5rem,3.5vw,3rem)] mt-2 opacity-70 leading-none"
            style={{ color: d.accent }}
          >
            {d.native}
          </p>

          {/* Bottom row */}
          <div className="mt-8 flex items-center gap-6">
            <Link
              href={`/destinations/${d.slug}`}
              className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-white/80 hover:text-white transition-colors group"
            >
              <span
                className="w-9 h-9 rounded-full border flex items-center justify-center transition-transform group-hover:translate-x-1"
                style={{ borderColor: d.accent, color: d.accent }}
              >
                →
              </span>
              Explore stays
            </Link>

            <span className="text-white/30 font-mono text-[10px] tracking-[0.28em] uppercase">
              {d.listingCount ?? 100} curated
            </span>

            <span className="text-white/30 font-mono text-[10px] tracking-[0.28em] uppercase">
              {d.bestTime}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
