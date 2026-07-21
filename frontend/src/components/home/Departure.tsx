"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import Magnetic from "@/components/fx/Magnetic";
import type { Destination } from "@/lib/destinations";

interface DepartureProps {
  destinations: Destination[];
  videoSrc?: string;
}

/**
 * Final CTA — "Boarding".
 *
 * Background: faint ambient looping video (Veo-generated) over --paper.
 * Foreground: a cluster of 4 destination thumbnails floating at different
 * depths, each responding to cursor parallax. Centered headline + Magnetic CTA.
 */
export default function Departure({ destinations, videoSrc = "/departure.mp4" }: DepartureProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Cursor parallax — normalized -1..1 from container center
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = containerRef.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      px.set((e.clientX - cx) / rect.width);
      py.set((e.clientY - cy) / rect.height);
    }
    function onLeave() {
      px.set(0);
      py.set(0);
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [px, py, prefersReducedMotion]);

  const cluster = destinations.slice(0, 4);
  // Depth layout: position, depth (lower = further), rotation
  const layout = [
    { pos: "top-[12%] left-[6%] w-[18vw] max-w-[260px]", depth: 0.6, rot: -8 },
    { pos: "top-[8%] right-[8%] w-[22vw] max-w-[300px]", depth: 1.2, rot: 6 },
    { pos: "bottom-[12%] left-[12%] w-[20vw] max-w-[280px]", depth: 0.9, rot: 12 },
    { pos: "bottom-[10%] right-[6%] w-[16vw] max-w-[240px]", depth: 1.4, rot: -6 },
  ];

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100svh] flex items-center bg-[var(--paper)] border-t border-[var(--ink)] py-32 md:py-56 overflow-hidden"
    >
      {/* Ambient video background */}
      {!videoFailed && videoSrc && !prefersReducedMotion && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.22] mix-blend-multiply"
          onError={() => setVideoFailed(true)}
          aria-hidden
        />
      )}

      <div className="absolute inset-0 grid-lines opacity-50 pointer-events-none" />

      {/* Floating destination thumbnails */}
      {!prefersReducedMotion &&
        cluster.map((d, i) => {
          const cfg = layout[i];
          return (
            <FloatingThumb
              key={d.slug}
              destination={d}
              pos={cfg.pos}
              depth={cfg.depth}
              rotation={cfg.rot}
              sx={sx}
              sy={sy}
            />
          );
        })}

      {/* Centered content */}
      <div className="relative z-10 max-w-[1500px] mx-auto px-6 md:px-12 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow-muted mb-10"
        >
          /05 · Boarding
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-display leading-[0.86] tracking-[-0.03em] text-[clamp(3rem,10vw,11rem)]"
        >
          <span className="block">Your next</span>
          <em
            className="italic-display block"
            style={{ color: "var(--terra)" }}
          >
            arrival
          </em>
          <span className="block">is one sentence away.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5"
        >
          <Magnetic strength={0.3}>
            <Link
              href="/chat"
              className="group inline-flex items-center gap-2 pl-8 pr-1.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-all"
            >
              Begin a conversation
              <span className="w-10 h-10 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300">
                →
              </span>
            </Link>
          </Magnetic>
          <Link
            href="/destinations"
            className="px-8 py-4 rounded-full text-sm font-medium border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all"
          >
            Walk the atlas
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

interface FloatingThumbProps {
  destination: Destination;
  pos: string;
  depth: number;
  rotation: number;
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
}

function FloatingThumb({ destination: d, pos, depth, rotation, sx, sy }: FloatingThumbProps) {
  // Each thumb translates by sx/sy * depth (in px)
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);

  // Wire sx/sy to tx/ty proportional to depth
  useEffect(() => {
    const unsubX = sx.on("change", (v) => tx.set(v * depth * 40));
    const unsubY = sy.on("change", (v) => ty.set(v * depth * 40));
    return () => {
      unsubX();
      unsubY();
    };
  }, [sx, sy, tx, ty, depth]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 + depth * 0.1 }}
      style={{ x: tx, y: ty, rotate: rotation }}
      className={`absolute ${pos} aspect-[3/4] rounded-md overflow-hidden shadow-2xl pointer-events-none img-grain`}
    >
      <Image
        src={d.hero}
        alt={d.name}
        fill
        className="object-cover"
        sizes="22vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/60 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 text-[var(--paper)]">
        <p
          className="font-mono text-[9px] tracking-[0.32em] uppercase opacity-80"
          style={{ color: d.accent }}
        >
          N° {String(d.listingCount ?? 100)}
        </p>
        <p className="font-display text-base md:text-lg leading-tight">{d.name}</p>
      </div>
    </motion.div>
  );
}
