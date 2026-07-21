"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import WelcomeLoader from "@/components/fx/WelcomeLoader";
import Marquee from "@/components/fx/Marquee";
import ProgressiveBlur from "@/components/fx/ProgressiveBlur";
import HeroSequence from "@/components/home/HeroSequence";
import ManifestoReveal from "@/components/home/ManifestoReveal";
import AtlasShowcase from "@/components/home/AtlasShowcase";
import AtlasZoom from "@/components/home/AtlasZoom";
import DoorCard, { type DoorCardData } from "@/components/home/DoorCard";
import ConciergeFrame from "@/components/home/ConciergeFrame";
import Departure from "@/components/home/Departure";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import { DESTINATIONS } from "@/lib/destinations";

const MARQUEE_ITEMS = [
  ...DESTINATIONS.map((d) => `${d.name} · ${d.listingCount ?? 100} Curated Stays`),
  "Concierge · Always Online",
  "Hand-Walked. Not Algorithmic.",
  "From sentence to sleep",
  "Slow Travel · Lit Right",
];

const STATS = [
  {
    value: DESTINATIONS.reduce((acc, d) => acc + (d.listingCount ?? 100), 0),
    label: "Curated stays",
    suffix: "+",
  },
  { value: DESTINATIONS.length, label: "Cities of arrival", suffix: "" },
  { value: 312, label: "Mornings authored", suffix: "" },
  { value: 24, label: "Concierge · always", suffix: "/7" },
];

const DOORS: DoorCardData[] = [
  {
    numeral: "I",
    title: "Tell us.",
    body: "In one sentence, describe the room you want to wake in. The hour. The light. The street outside.",
    videoSrc: "/doors/door-1.mp4",
    accent: "var(--terra)",
    gradient:
      "linear-gradient(135deg, var(--terra-soft) 0%, var(--terra) 50%, var(--terra-deep) 100%)",
  },
  {
    numeral: "II",
    title: "We listen.",
    body: "The concierge reads between your lines — light, hour, neighbourhood, the sound of the morning you want.",
    videoSrc: "/doors/door-2.mp4",
    accent: "var(--forest-bright)",
    gradient:
      "linear-gradient(135deg, var(--forest-bright) 0%, var(--forest-soft) 50%, var(--forest) 100%)",
  },
  {
    numeral: "III",
    title: "You arrive.",
    body: "Keys in your hand before the kettle's hot. Dates held, transit mapped, the corner café briefed on your usual.",
    videoSrc: "/doors/door-3.mp4",
    accent: "var(--ochre-bright)",
    gradient:
      "linear-gradient(135deg, var(--ochre-bright) 0%, var(--ochre) 50%, var(--ochre-deep) 100%)",
  },
];

export default function HomePage() {
  const [loaderDone, setLoaderDone] = useState(false);

  useEffect(() => {
    // Scroll snapping removed for smooth transition UX
  }, []);

  return (
    <>
      <WelcomeLoader onComplete={() => setLoaderDone(true)} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaderDone ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-[var(--paper)] text-[var(--ink)] overflow-x-clip"
      >
        {/* ── HERO — Scroll frame sequence ─────────────────────────── */}
        <HeroSequence />

        {/* ── MARQUEE — short editorial band ───────────────────────── */}
        <section className="relative w-full bg-[var(--paper)] py-8 z-20">
          <div className="w-full relative">
            <Marquee
              duration={42}
              className="text-[11px] font-mono tracking-[0.28em] uppercase text-[var(--ink-muted)]"
            >
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={i} className="flex items-center gap-6 shrink-0">
                  <span>{item}</span>
                  <span className="text-[var(--ochre)] text-lg leading-none">·</span>
                </span>
              ))}
            </Marquee>
          </div>
        </section>

        {/* ── MANIFESTO — per-word scroll reveal ───────────────────── */}
        <ManifestoReveal />

        {/* ── STATS STRIP ──────────────────────────────────────────── */}
        <section className="relative w-full bg-[var(--paper)] py-12 md:py-24 z-20">
          <div className="w-full relative">
            <div className="max-w-[1500px] mx-auto grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, i) => (
                <StatCounter key={stat.label} stat={stat} index={i} />
              ))}
            </div>
            <ProgressiveBlur
              direction="bottom"
              layers={4}
              intensity={0.25}
              className="h-12 top-auto bottom-0 pointer-events-none"
            />
          </div>
        </section>

        {/* ── ATLAS — horizontal destinations showcase ─────────────── */}
        <AtlasShowcase destinations={DESTINATIONS} />

        {/* ── ATLAS ZOOM — immersive interlude ─────────────────────── */}
        <AtlasZoom />

        {/* ── THE THREE DOORS — How it works ───────────────────────── */}
        <section className="relative min-h-[100svh] bg-[var(--paper-soft)]">
          <div className="max-w-[1500px] mx-auto px-6 md:px-12 pt-32 md:pt-44 pb-24">
            <div className="grid md:grid-cols-12 gap-8 mb-20">
              <div className="md:col-span-3">
                <Reveal>
                  <p className="eyebrow-muted">/04 · The Three Doors</p>
                </Reveal>
              </div>
              <div className="md:col-span-9">
                <RevealLines
                  as="h2"
                  className="font-display text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.025em]"
                  lines={[
                    <span key="1">From sentence,</span>,
                    <span key="2">
                      to <em className="italic-display text-[var(--forest)]">sleep</em>,
                    </span>,
                    <span key="3">in three doors.</span>,
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--ink)] grid md:grid-cols-3">
            {DOORS.map((door, i) => (
              <DoorCard
                key={door.numeral}
                data={door}
                index={i}
                isLast={i === DOORS.length - 1}
              />
            ))}
          </div>
        </section>

        {/* ── CONCIERGE PREVIEW ────────────────────────────────────── */}
        <ConciergeFrame />

        {/* ── DEPARTURE — final CTA ────────────────────────────────── */}
        <Departure destinations={DESTINATIONS} />

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer className="border-t border-[var(--ink)] py-12 bg-[var(--paper-soft)]">
          <div className="max-w-[1500px] mx-auto px-6 md:px-12 grid md:grid-cols-3 gap-8 items-center">
            <div className="font-display text-2xl">
              Stay<em className="italic-display">Bot</em>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)] text-center font-mono tracking-[0.32em] uppercase">
              © 2025 · A Living Atlas · Composed with care
            </p>
            <div className="flex items-center justify-end gap-6 text-xs text-[var(--ink-muted)]">
              <Link href="/destinations" className="hover:text-[var(--ink)] transition-colors">
                Atlas
              </Link>
              <Link href="/explore" className="hover:text-[var(--ink)] transition-colors">
                Stays
              </Link>
              <Link href="/chat" className="hover:text-[var(--ink)] transition-colors">
                Concierge
              </Link>
            </div>
          </div>
        </footer>
      </motion.div>
    </>
  );
}

// ── StatCounter ────────────────────────────────────────────────────────────────

function StatCounter({ stat, index }: { stat: typeof STATS[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!isInView) return;
    const controls = { stop: () => {} };
    const start = performance.now();
    const duration = 1800 + index * 150;
    const target = stat.value;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      count.set(eased * target);
      if (progress < 1) {
        const id = requestAnimationFrame(tick);
        controls.stop = () => cancelAnimationFrame(id);
      }
    }
    const id = requestAnimationFrame(tick);
    controls.stop = () => cancelAnimationFrame(id);
    return () => controls.stop();
  }, [isInView, stat.value, index, count]);

  return (
    <div
      ref={ref}
      className={`py-10 px-6 md:px-10 ${
        index > 0 ? "border-l border-[var(--ink)]" : ""
      } relative group hover:bg-[var(--paper-soft)] transition-colors duration-300`}
    >
      <div className="flex items-baseline gap-0.5 mb-1">
        <motion.span className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tight tabular-nums">
          {rounded}
        </motion.span>
        <span className="font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-none text-[var(--ochre)]">
          {stat.suffix}
        </span>
      </div>
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
        {stat.label}
      </p>
    </div>
  );
}
