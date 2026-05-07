"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { DESTINATIONS } from "@/lib/destinations";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import Magnetic from "@/components/fx/Magnetic";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function DestinationsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] pt-32 pb-32">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="grid md:grid-cols-12 gap-12 mb-24">
          <div className="md:col-span-3">
            <Reveal>
              <p className="eyebrow">Vol. I · Three cities</p>
            </Reveal>
          </div>
          <div className="md:col-span-9">
            <RevealLines
              as="h1"
              className="font-display text-[clamp(3rem,7vw,8rem)] leading-[0.86] tracking-[-0.03em] mb-10"
              lines={["The atlas", <span key="b">is <em className="text-[var(--amber)] italic">small</em>.</span>]}
            />
            <Reveal delay={0.2}>
              <p className="text-[var(--text-secondary)] text-lg max-w-2xl leading-relaxed pretty">
                We don't go everywhere. We go deep. Each of these three cities has been wandered, slept in, eaten through, and
                photographed by hand. What follows is what we found.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Destination cards (large, alternating) */}
        <div className="space-y-32">
          {DESTINATIONS.map((d, i) => (
            <DestinationCard key={d.slug} d={d} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DestinationCard({ d, index }: { d: typeof DESTINATIONS[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const reverse = index % 2 === 1;

  return (
    <div ref={ref} className={`grid md:grid-cols-12 gap-8 md:gap-12 items-center ${reverse ? "md:[direction:rtl]" : ""}`}>
      <div className="md:col-span-7 md:[direction:ltr]">
        <Link href={`/destinations/${d.slug}`} className="block group">
          <motion.div
            className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-[var(--border)]"
            whileHover={{ scale: 0.99 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div className="absolute inset-0" style={{ y: imageY }}>
              <Image
                src={d.hero}
                alt={d.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)]/60 via-transparent to-transparent" />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(ellipse at center, ${d.accent}1F 0%, transparent 70%)` }}
            />

            <div className="absolute top-6 left-6 right-6 flex items-start justify-between font-mono text-[10px] tracking-widest uppercase text-white/80">
              <span>{d.coordinate}</span>
              <span>N° {String(index + 1).padStart(2, "0")}</span>
            </div>

            <div className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[var(--bg-void)]/60 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              →
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="md:col-span-5 md:[direction:ltr]">
        <Reveal>
          <p className="eyebrow mb-5" style={{ color: d.accent }}>
            {d.tagline}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.02em] mb-2">
            {d.name}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="font-display italic text-xl mb-8 opacity-70" style={{ color: d.accent }}>
            {d.native}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-8 pretty">
            {d.intro}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-10 font-mono text-[11px] tracking-wider uppercase">
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">Best time</span>
              <span className="text-[var(--text-primary)]">{d.bestTime}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">Language</span>
              <span className="text-[var(--text-primary)]">{d.language}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">Currency</span>
              <span className="text-[var(--text-primary)]">{d.currency}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">Stays</span>
              <span style={{ color: d.accent }}>180 curated</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <Magnetic strength={0.25} className="inline-block">
            <Link
              href={`/destinations/${d.slug}`}
              className="group inline-flex items-center gap-2 pl-6 pr-1.5 py-1.5 rounded-full border text-sm transition-colors duration-300"
              style={{ borderColor: d.accent, color: d.accent }}
            >
              Wander {d.name}
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--bg-void)] group-hover:rotate-[-45deg] transition-transform duration-300"
                style={{ background: d.accent }}
              >
                →
              </span>
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </div>
  );
}
