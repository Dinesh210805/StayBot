"use client";

import { useRef, useState, useEffect } from "react";
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
  const boundsRef = useRef({ top: 0, height: 0 });
  const prefersReducedMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);
  const n = destinations.length;

  // Measure section position once on mount (and on resize).
  // Storing in a ref avoids re-renders; the transform function reads it on each scroll tick.
  useEffect(() => {
    const measure = () => {
      const el = sectionRef.current;
      if (!el) return;
      boundsRef.current = {
        top: el.getBoundingClientRect().top + window.scrollY,
        height: el.offsetHeight,
      };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { scrollY } = useScroll();

  // Derive 0→1 progress directly from live scroll position vs. cached section bounds.
  // progress=0  → section top just reached viewport top  (sticky activates)
  // progress=1  → section bottom just reached viewport bottom (sticky releases)
  const progress = useTransform(scrollY, (y) => {
    const { top, height } = boundsRef.current;
    const viewH = typeof window !== "undefined" ? window.innerHeight : 800;
    const range = height - viewH; // scrollable distance while pinned
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (y - top) / range));
  });

  useMotionValueEvent(progress, "change", (v) => {
    setActiveIdx(Math.min(n - 1, Math.max(0, Math.floor(v * n))));
  });

  // (n + 1) × 100svh tall section:
  //   usable sticky scroll = n × 100svh  →  each destination gets exactly 1 viewport of scroll
  const sectionHeight = `${(n + 1) * 100}svh`;

  if (prefersReducedMotion) {
    return (
      <section className="relative bg-[var(--ink)] py-24 px-6 md:px-12">
        <div className="max-w-[1500px] mx-auto mb-16">
          <p className="eyebrow-muted text-[var(--paper)]/50 mb-6">/02 · The Atlas</p>
          <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em] text-[var(--paper)] max-w-[20ch]">
            Four cities. One concierge.{" "}
            <em className="italic-display">A thousand mornings</em>.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-[1500px] mx-auto">
          {destinations.map((d) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="group relative aspect-[4/5] rounded-lg overflow-hidden"
            >
              <Image
                src={d.hero}
                alt={d.name}
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p
                  className="font-mono text-[10px] tracking-[0.32em] uppercase mb-2"
                  style={{ color: d.accent }}
                >
                  {d.tagline}
                </p>
                <h3 className="font-display text-3xl md:text-4xl leading-[0.95]">
                  {d.name}
                </h3>
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
            progress={progress}
          />
        ))}

        {/* HUD — always on top */}
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 md:p-10">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">
              /02 · The Atlas
            </p>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">
              <span>{String(activeIdx + 1).padStart(2, "0")}</span>
              <span>/</span>
              <span>{String(n).padStart(2, "0")}</span>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-3">
            {destinations.map((d, i) => (
              <motion.span
                key={d.slug}
                className="block rounded-full"
                animate={{
                  background: i === activeIdx ? d.accent : "rgba(255,255,255,0.25)",
                  width: i === activeIdx ? 28 : 6,
                  height: 6,
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
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

function DestinationLayer({ destination: d, index: i, total: n, progress }: LayerProps) {
  // Each slot occupies progress range [i/n, (i+1)/n]
  const slotStart = i / n;
  const slotEnd = (i + 1) / n;

  // Crossfade zone is 15% of one slot on each edge
  const xfade = 0.15 / n;

  const inStart = Math.max(0, slotStart - xfade);
  const inEnd = Math.min(slotEnd, slotStart + xfade);
  const outStart = Math.max(slotStart, slotEnd - xfade);
  const outEnd = Math.min(1, slotEnd + xfade);

  const isFirst = i === 0;
  const isLast = i === n - 1;

  // First card: starts fully opaque, fades out at its slot end.
  // Last card: fades in at its slot start, stays fully opaque.
  // Middle cards: fade in then fade out.
  const opacityKP = isFirst
    ? ([0, outStart, outEnd] as number[])
    : isLast
    ? ([inStart, inEnd, 1] as number[])
    : ([inStart, inEnd, outStart, outEnd] as number[]);

  const opacityV = isFirst
    ? ([1, 1, 0] as number[])
    : isLast
    ? ([0, 1, 1] as number[])
    : ([0, 1, 1, 0] as number[]);

  const scaleKP = isFirst
    ? ([0, outStart, outEnd] as number[])
    : isLast
    ? ([inStart, inEnd, 1] as number[])
    : ([inStart, inEnd, outStart, outEnd] as number[]);

  const scaleV = isFirst
    ? ([1, 1.02, 1.05] as number[])
    : isLast
    ? ([1.05, 1, 1.02] as number[])
    : ([1.05, 1, 1.02, 1.05] as number[]);

  const opacity = useTransform(progress, opacityKP, opacityV);
  const scale = useTransform(progress, scaleKP, scaleV);

  // Text slides up on entry, slides up on exit
  const textYKP = isFirst ? [0, outStart] : [inStart, inEnd, outStart];
  const textYV = isFirst ? [0, -20] : [20, 0, -20];
  const textY = useTransform(progress, textYKP, textYV);

  const textOpKP = isFirst
    ? ([0, 0.01, outStart, outEnd] as number[])
    : isLast
    ? ([inStart, inEnd, 1] as number[])
    : ([inStart, inEnd, outStart, outEnd] as number[]);

  const textOpV = isFirst
    ? ([1, 1, 1, 0] as number[])
    : isLast
    ? ([0, 1, 1] as number[])
    : ([0, 1, 1, 0] as number[]);

  const textOpacity = useTransform(progress, textOpKP, textOpV);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ opacity, zIndex: i + 1 }}
    >
      {/* Background image with subtle zoom */}
      <motion.div className="absolute inset-0" style={{ scale }}>
        <Image
          src={d.hero}
          alt={d.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority={i === 0}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
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
