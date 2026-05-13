"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DESTINATIONS } from "@/lib/destinations";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

// 0 = intro, 1..n = destination index
const TOTAL = DESTINATIONS.length + 1;

export default function DestinationsPage() {
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);

  const navigate = useCallback((dir: 1 | -1) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setActive((prev) => Math.max(0, Math.min(TOTAL - 1, prev + dir)));
    setTimeout(() => { lockRef.current = false; }, 900);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10) return;
      navigate(e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); navigate(1); }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); navigate(-1); }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [navigate]);

  const destIndex = active - 1; // -1 when on intro

  return (
    <div className="h-screen overflow-hidden relative bg-[var(--paper)]">
      {/* Sliding container */}
      <motion.div
        className="absolute inset-x-0 top-0"
        style={{ height: `${TOTAL * 100}vh` }}
        animate={{ y: `-${active * 100}vh` }}
        transition={{ duration: 0.85, ease: easeOutExpo }}
      >
        {/* ── Intro section ── */}
        <IntroSection />

        {/* ── Destination sections ── */}
        {DESTINATIONS.map((d, i) => (
          <DestinationSection key={d.slug} d={d} index={i} />
        ))}
      </motion.div>

      {/* ── Side nav dots ── */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const isActive = active === i;
          const accentHex = i > 0 ? DESTINATIONS[i - 1]?.accent : undefined;
          return (
            <button
              key={i}
              onClick={() => { if (!lockRef.current) { lockRef.current = true; setActive(i); setTimeout(() => { lockRef.current = false; }, 900); } }}
              className="w-2 h-2 rounded-full outline-none transition-all duration-300"
              style={{
                background: isActive ? (accentHex ?? "var(--ink)") : "rgba(0,0,0,0.18)",
                transform: isActive ? "scale(1.5)" : "scale(1)",
              }}
              aria-label={i === 0 ? "Intro" : DESTINATIONS[i - 1]?.name}
            />
          );
        })}
      </div>

      {/* ── Progress label ── */}
      <AnimatePresence mode="wait">
        {destIndex >= 0 ? (
          <motion.div
            key={destIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed bottom-8 left-8 z-50 font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)]"
          >
            N° {String(destIndex + 1).padStart(2, "0")} / {String(DESTINATIONS.length).padStart(2, "0")}
            <span className="mx-3 opacity-40">·</span>
            {DESTINATIONS[destIndex]?.coordinate}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function IntroSection() {
  return (
    <section className="h-screen flex flex-col bg-[var(--paper)] relative overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-[0.035] pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center px-8 md:px-20 max-w-[1400px] mx-auto w-full">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
          className="font-mono text-[10px] tracking-[0.42em] uppercase text-[var(--ink-muted)] mb-8"
        >
          Vol. I · {DESTINATIONS.length} cities
        </motion.p>

        <h1 className="font-display text-[clamp(4rem,10vw,11rem)] leading-[0.86] tracking-[-0.03em] mb-10 text-[var(--ink)]">
          {["The", "atlas"].map((word, i) => (
            <span key={word} className="block overflow-hidden" style={{ paddingBottom: "0.04em" }}>
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.0, ease: easeOutExpo, delay: 0.2 + i * 0.08 }}
              >
                {i === 1 ? (
                  <>is <em className="italic-display" style={{ color: "var(--ochre)" }}>small</em>.</>
                ) : word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: easeOutExpo }}
          className="text-[var(--ink-soft)] text-lg md:text-xl leading-relaxed max-w-xl pretty"
        >
          We don&apos;t go everywhere. We go deep. Each city has been wandered, slept in,
          and photographed by hand. Scroll to begin.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="px-8 md:px-20 pb-10 flex items-center gap-3 text-[var(--ink-muted)]"
      >
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="font-mono text-xs"
        >
          ↓
        </motion.span>
        <span className="font-mono text-[9px] tracking-[0.38em] uppercase">Scroll to explore</span>
      </motion.div>
    </section>
  );
}

function DestinationSection({ d, index }: {
  d: typeof DESTINATIONS[number];
  index: number;
}) {
  return (
    <section className="h-screen flex bg-[var(--paper)] relative overflow-hidden">
      {/* Left: hero image (55%) */}
      <div className="relative w-[55%] shrink-0 overflow-hidden">
        <Image
          src={d.hero}
          alt={d.name}
          fill
          className="object-cover"
          sizes="55vw"
          priority={index === 0}
        />
        {/* Soft right-edge fade into paper */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--paper)]" />
        {/* Bottom-left accent bar */}
        <div
          className="absolute bottom-0 left-0 w-24 h-[3px]"
          style={{ background: d.accent }}
        />
      </div>

      {/* Right: text panel (45%) */}
      <div className="flex-1 flex flex-col justify-center px-10 md:px-16 py-16 overflow-hidden">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="font-mono text-[10px] tracking-[0.38em] uppercase mb-6"
          style={{ color: d.accent }}
        >
          {d.tagline}
        </motion.p>

        {/* City name */}
        <div className="overflow-hidden mb-2">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.85, ease: easeOutExpo }}
            className="font-display text-[clamp(3.5rem,7vw,8rem)] leading-[0.86] tracking-[-0.03em] text-[var(--ink)]"
          >
            {d.name}
          </motion.h2>
        </div>

        {/* Native name */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOutExpo }}
          className="font-display italic text-xl md:text-2xl mb-8 opacity-40 text-[var(--ink)]"
        >
          {d.native}
        </motion.p>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.25, ease: easeOutExpo }}
          className="text-[var(--ink-soft)] text-base leading-relaxed pretty max-w-sm mb-8"
        >
          {d.intro}
        </motion.p>

        {/* Meta grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.35, ease: easeOutExpo }}
          className="grid grid-cols-2 gap-2 font-mono text-[10px] tracking-widest uppercase mb-10 max-w-sm"
        >
          {[
            { label: "Best time", value: d.bestTime },
            { label: "Language", value: d.language },
            { label: "Currency", value: d.currency },
            { label: "Stays", value: `${d.listingCount ?? 100} curated` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 p-3 border border-[var(--ink-line)] rounded"
            >
              <span className="text-[var(--ink-muted)]">{label}</span>
              <span className="text-[var(--ink-soft)]">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Link
            href={`/destinations/${d.slug}`}
            className="group inline-flex items-center gap-2 pl-6 pr-1.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300"
            style={{ border: `1px solid ${d.accent}`, color: d.accent }}
          >
            Wander {d.name}
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--paper)] group-hover:rotate-[-45deg] transition-transform duration-300"
              style={{ background: d.accent }}
            >
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
