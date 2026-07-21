"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

/**
 * Immersive zoom-out gallery interlude — "Slept Here".
 *
 * Sticky 200svh section. Six small destination interiors are arranged on
 * screen; each zooms out at a different rate as the user scrolls. At ~70%
 * progress they fade and a centered italic line resolves with an --ochre
 * underline draw-on.
 */

const TILES = [
  {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1400&q=85",
    pos: "left-[5%] top-[8%] w-[26vw] h-[28svh] -rotate-[3deg]",
    scale: [1, 1.9] as [number, number],
  },
  {
    src: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1400&q=85",
    pos: "right-[6%] top-[4%] w-[22vw] h-[34svh] rotate-[4deg]",
    scale: [1, 2.2] as [number, number],
  },
  {
    src: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1400&q=85",
    pos: "left-[28%] top-[40%] w-[20vw] h-[26svh] rotate-[1deg]",
    scale: [1, 2.5] as [number, number],
  },
  {
    src: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1400&q=85",
    pos: "right-[24%] top-[44%] w-[24vw] h-[30svh] -rotate-[6deg]",
    scale: [1, 2.0] as [number, number],
  },
  {
    src: "https://images.unsplash.com/photo-1551776235-dde6d482980b?w=1400&q=85",
    pos: "left-[12%] bottom-[6%] w-[22vw] h-[24svh] -rotate-[2deg]",
    scale: [1, 2.4] as [number, number],
  },
  {
    src: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1400&q=85",
    pos: "right-[10%] bottom-[8%] w-[26vw] h-[26svh] rotate-[5deg]",
    scale: [1, 1.8] as [number, number],
  },
];

interface TileProps {
  src: string;
  pos: string;
  scaleRange: [number, number];
  progress: MotionValue<number>;
}

function Tile({ src, pos, scaleRange, progress }: TileProps) {
  const scale = useTransform(progress, [0, 0.65], scaleRange);
  const opacity = useTransform(progress, [0, 0.42, 0.60], [1, 1, 0]);
  return (
    <motion.div
      style={{ scale, opacity }}
      className={`absolute ${pos} overflow-hidden rounded-md shadow-2xl img-grain`}
    >
      <Image src={src} alt="" fill className="object-cover" sizes="30vw" />
    </motion.div>
  );
}

export default function AtlasZoom() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const textOpacity = useTransform(scrollYProgress, [0.50, 0.68], [0, 1]);
  const textScale = useTransform(scrollYProgress, [0.50, 0.78], [0.92, 1]);
  const underlineScaleX = useTransform(scrollYProgress, [0.65, 0.88], [0, 1]);

  if (prefersReducedMotion) {
    return (
      <section className="relative min-h-[100svh] flex items-center bg-[var(--paper)] py-32 px-6 md:px-12 text-center">
        <h2 className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-tight max-w-3xl mx-auto">
          <em className="italic-display">We slept here so you wouldn&apos;t have to guess.</em>
        </h2>
        <div className="mx-auto mt-6 h-px w-32 bg-[var(--ochre)]" />
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative h-[220svh] bg-[var(--paper)]">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Zoom tiles */}
        {TILES.map((t, i) => (
          <Tile
            key={i}
            src={t.src}
            pos={t.pos}
            scaleRange={t.scale}
            progress={scrollYProgress}
          />
        ))}

        {/* Resolving text */}
        <motion.div
          style={{ opacity: textOpacity, scale: textScale }}
          className="absolute inset-0 flex items-center justify-center px-6"
        >
          <div className="max-w-4xl text-center">
            <p className="eyebrow-muted mb-6">/03 · The Field Notes</p>
            <h2 className="font-display text-[clamp(2.2rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
              We slept here so you{" "}
              <em className="italic-display" style={{ color: "var(--terra)" }}>
                wouldn&apos;t have to guess.
              </em>
            </h2>
            <motion.div
              style={{ scaleX: underlineScaleX }}
              className="mx-auto mt-8 h-[2px] w-40 origin-left bg-[var(--ochre)]"
            />
            <p className="mt-6 text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
              Every listing has been walked, woken in, and stress-tested at 3am
              by someone we trust.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
