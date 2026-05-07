"use client";

import { useRef, useState, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WelcomeLoader from "@/components/fx/WelcomeLoader";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import Marquee from "@/components/fx/Marquee";
import FilmStrip from "@/components/home/FilmStrip";
import ChatPreview from "@/components/home/ChatPreview";
import { DESTINATIONS } from "@/lib/destinations";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CITIES = DESTINATIONS.map((d) => ({
  slug: d.slug,
  name: d.name,
  native: d.native,
  tagline: d.tagline,
  desc: d.intro,
  accentHex: d.accent,
  listings: d.listingCount ?? 100,
  image: d.hero,
  coordinate: d.coordinate,
}));

const TOC = [
  { no: "01", title: "The Atlas", desc: "Three cities, hand-picked.", href: "/destinations" },
  { no: "02", title: "The Stays", desc: "450 properties, no algorithm.", href: "/explore" },
  { no: "03", title: "The Calendar", desc: "Hold your dates.", href: "/booking" },
  { no: "04", title: "The Concierge", desc: "Speak. It will listen.", href: "/chat" },
];

const PRINCIPLES = [
  { no: "I", title: "Conversation, not forms", body: "Tell us what you want in plain language. The concierge handles the rest." },
  { no: "II", title: "Curated, not crowded", body: "Hand-picked stays. No infinite scroll. Just places worth waking up in." },
  { no: "III", title: "Memory that travels", body: "Your concierge remembers. The next conversation begins where the last one ended." },
  { no: "IV", title: "From inquiry to arrival", body: "Calendar, neighborhood, transit, restaurants — handled inside one conversation." },
];

const MARQUEE_ITEMS = [
  ...DESTINATIONS.map((d) => `${d.name} · ${d.listingCount ?? 100} Curated Stays`),
  "AI Concierge · Always On",
  "Free Cancellation Available",
  "Describe It · We Curate It",
  "Hand-Picked. Not Algorithmic.",
  "From Inquiry to Arrival",
];

const STATS = [
  { value: DESTINATIONS.reduce((acc, d) => acc + (d.listingCount ?? 100), 0), label: "Curated stays", suffix: "+" },
  { value: DESTINATIONS.length, label: "World cities", suffix: "" },
  { value: 98, label: "Guest satisfaction", suffix: "%" },
  { value: 24, label: "Concierge hours", suffix: "/7" },
];

export default function HomePage() {
  const [loaderDone, setLoaderDone] = useState(false);
  const [activeCity, setActiveCity] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroScroll, [0, 1], ["0%", "-12%"]);
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);
  const heroImgScale = useTransform(heroScroll, [0, 1], [1, 1.08]);
  const scrollIndicatorOpacity = useTransform(heroScroll, [0, 0.18], [1, 0]);

  const pinSectionRef = useRef<HTMLDivElement>(null);
  const pinInnerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const section = pinSectionRef.current;
    const inner = pinInnerRef.current;
    if (!section || !inner) return;

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${CITIES.length * 110}%`,
        pin: inner,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.4,
        onUpdate: (self) => {
          const idx = Math.min(
            CITIES.length - 1,
            Math.max(0, Math.floor(self.progress * CITIES.length * 0.999))
          );
          setActiveCity(idx);
        },
      });
      return () => trigger.kill();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <WelcomeLoader onComplete={() => setLoaderDone(true)} />

      <div className="relative bg-[var(--paper)] text-[var(--ink)] overflow-x-hidden">
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div ref={heroRef} className="relative">
          <section className="relative min-h-[100svh] flex flex-col bg-[var(--ink)] overflow-hidden">

            {/* Subtle grid texture */}
            <div className="absolute inset-0 grid-lines opacity-[0.04] pointer-events-none z-0" />

            {/* Ghost coordinate watermark */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
              <span className="absolute bottom-[18%] left-[-1%] font-mono text-[9vw] leading-none tracking-[0.04em] text-white opacity-[0.025] rotate-[-90deg] origin-bottom-left whitespace-nowrap">
                {CITIES[0]?.coordinate ?? ""}
              </span>
            </div>

            {/* Main split grid */}
            <div className="relative z-10 flex-1 grid md:grid-cols-12 min-h-[100svh]">

              {/* ── LEFT: Editorial typography ── */}
              <motion.div
                style={{ y: heroY, opacity: heroOpacity }}
                className="md:col-span-7 flex flex-col justify-between px-6 md:px-12 pt-32 md:pt-36 pb-10 md:pb-16"
              >
                {/* Top meta row */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: loaderDone ? 1 : 0, y: loaderDone ? 0 : 8 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: easeOutExpo }}
                  className="flex items-center gap-5 font-mono text-[10px] tracking-[0.32em] uppercase text-white/30"
                >
                  <span>Est · MMXXV</span>
                  <span className="h-px flex-1 max-w-[60px] bg-white/15" />
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)] animate-pulse" />
                    Concierge online
                  </span>
                </motion.div>

                {/* Staggered mega-headline */}
                <div className="py-6 md:py-10">
                  <motion.p
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: loaderDone ? 1 : 0, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.28, ease: easeOutExpo }}
                    className="font-mono text-[10px] tracking-[0.42em] uppercase text-white/35 mb-7"
                  >
                    / A Living Atlas of Stays
                  </motion.p>

                  <h1 className="leading-[0.84] tracking-[-0.03em] text-white">
                    {[
                      <span key="a" className="font-display text-[clamp(3.6rem,10.5vw,10.5rem)] block">Where</span>,
                      <span key="b" className="font-display text-[clamp(3.6rem,10.5vw,10.5rem)] block pl-[12%]">you <em className="italic-display" style={{ color: "var(--ochre)" }}>sleep</em></span>,
                      <span key="c" className="font-display text-[clamp(1.1rem,2.8vw,2.8rem)] block opacity-35 tracking-[0.02em]">— is the —</span>,
                      <span key="d" className="font-display italic-display text-[clamp(4rem,11.5vw,11.5rem)] block" style={{ color: "var(--terra)" }}>story.</span>,
                    ].map((line, i) => (
                      <span key={i} className="block overflow-hidden" style={{ paddingBottom: "0.05em" }}>
                        <motion.span
                          className="block"
                          initial={{ y: "110%" }}
                          animate={{ y: loaderDone ? "0%" : "110%" }}
                          transition={{ duration: 1.0, ease: easeOutExpo, delay: 0.35 + i * 0.08 }}
                        >
                          {line}
                        </motion.span>
                      </span>
                    ))}
                  </h1>
                </div>

                {/* Bottom: desc + CTAs + scroll hint */}
                <div className="space-y-7">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: loaderDone ? 1 : 0, y: loaderDone ? 0 : 12 }}
                    transition={{ duration: 1, delay: 0.55, ease: easeOutExpo }}
                    className="text-white/40 text-base leading-relaxed max-w-xs"
                  >
                    Describe what you want.<br />We curate where you sleep.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: loaderDone ? 1 : 0, y: loaderDone ? 0 : 12 }}
                    transition={{ duration: 1, delay: 0.7, ease: easeOutExpo }}
                    className="flex flex-wrap items-center gap-4"
                  >
                    <Link
                      href="/chat"
                      className="group inline-flex items-center gap-2 pl-7 pr-1.5 py-1.5 rounded-full bg-white text-[var(--ink)] text-sm font-medium hover:bg-white/90 transition-all"
                    >
                      Begin a conversation
                      <span className="w-9 h-9 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300">
                        →
                      </span>
                    </Link>
                    <Link
                      href="/destinations"
                      className="text-sm text-white/30 hover:text-white/70 underline-offset-4 hover:underline decoration-white/20 transition-colors"
                    >
                      See destinations
                    </Link>
                  </motion.div>

                  <motion.div
                    style={{ opacity: scrollIndicatorOpacity }}
                    className="flex items-center gap-3 pointer-events-none"
                  >
                    <motion.div
                      animate={{ opacity: loaderDone ? 1 : 0 }}
                      transition={{ delay: 1.1, duration: 0.8 }}
                      className="flex items-center gap-3"
                    >
                      <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-white/18">Scroll</span>
                      <motion.span
                        animate={{ x: [0, 6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="font-mono text-xs text-white/18"
                      >
                        →
                      </motion.span>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

              {/* ── RIGHT: Stacked city cards ── */}
              <div className="hidden md:flex md:col-span-5 flex-col border-l border-white/[0.06]">
                {CITIES.map((city, i) => (
                  <motion.div
                    key={city.slug}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: loaderDone ? 1 : 0, x: 0 }}
                    transition={{ duration: 1.1, delay: 0.3 + i * 0.18, ease: easeOutExpo }}
                    className="relative flex-1 group overflow-hidden"
                  >
                    <Link href={`/destinations/${city.slug}`} className="absolute inset-0 block">
                      <Image
                        src={city.image}
                        alt={city.name}
                        fill
                        sizes="40vw"
                        priority={i === 0}
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                      {/* Layered overlays */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)]/75 via-[var(--ink)]/25 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15" />

                      {/* Top meta */}
                      <div className="absolute top-5 left-5 right-5 flex justify-between font-mono text-[9px] tracking-[0.3em] uppercase">
                        <span className="text-white/28">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-white/18">{city.coordinate}</span>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                        <div>
                          <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-2 opacity-90" style={{ color: city.accentHex }}>
                            {city.tagline}
                          </p>
                          <h3 className="font-display text-2xl lg:text-[1.9rem] text-white leading-none tracking-tight">
                            {city.name}
                          </h3>
                          <p className="font-display italic text-sm mt-1 opacity-50" style={{ color: city.accentHex }}>
                            {city.native}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 text-white/40 text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          →
                        </span>
                      </div>

                      {/* Ghost listing count */}
                      <div className="absolute bottom-2 right-4 font-display text-[5.5rem] leading-none text-white/[0.035] select-none pointer-events-none tabular-nums">
                        {city.listings}
                      </div>
                    </Link>
                    {i < CITIES.length - 1 && (
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.05]" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ── TOC STRIP ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loaderDone ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="border-b border-[var(--ink)] bg-[var(--paper)]"
        >
          <div className="max-w-[1500px] mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-4">
            {TOC.map((t, i) => (
              <Link
                key={t.no}
                href={t.href}
                className={`group py-6 md:py-8 px-4 ${i > 0 ? "border-l border-[var(--ink)]" : ""} hover:bg-[var(--ink-soft)] hover:text-[var(--paper)] transition-colors duration-300`}
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">/{t.no}</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl mb-1 italic-display">{t.title}</h3>
                <p className="text-xs opacity-70 group-hover:opacity-90">{t.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── MARQUEE TICKER ──────────────────────────────────────── */}
        <div className="border-y border-[var(--ink)] bg-[var(--paper-soft)] py-4 overflow-hidden">
          <Marquee duration={35} className="text-[11px] font-mono tracking-[0.28em] uppercase text-[var(--ink-muted)]">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="flex items-center gap-6 shrink-0">
                <span>{item}</span>
                <span className="text-[var(--ochre)] text-lg leading-none">·</span>
              </span>
            ))}
          </Marquee>
        </div>

        {/* ── STATS STRIP ─────────────────────────────────────────── */}
        <div className="border-b border-[var(--ink)] bg-[var(--paper)]">
          <div className="max-w-[1500px] mx-auto grid grid-cols-2 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <StatCounter key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        </div>

        {/* ── BENTO STATEMENT ─────────────────────────────────────── */}
        <section className="py-32 md:py-44 px-6 md:px-10 max-w-[1500px] mx-auto bg-[var(--paper)]">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-3">
              <Reveal>
                <p className="eyebrow">/01 · Approach</p>
              </Reveal>
            </div>
            <div className="md:col-span-9">
              <RevealLines
                as="h2"
                className="font-display text-[clamp(2.4rem,5.5vw,6rem)] leading-[0.92] tracking-[-0.025em] mb-12"
                lines={[
                  <span key="1">We don&apos;t sell rooms.</span>,
                  <span key="2">We compose <em className="italic-display text-[var(--terra)]">arrivals</em>.</span>,
                ]}
              />
              <Reveal delay={0.1}>
                <p className="text-[var(--ink-soft)] text-lg md:text-xl leading-[1.7] max-w-2xl pretty">
                  Travel software flattens where you sleep into a search result. We rebuild it as a
                  conversation — one that knows the difference between a balcony and a view, between
                  a quiet street and a lonely one.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-12 gap-3 md:gap-4 auto-rows-[180px] md:auto-rows-[220px]">
            <BentoTile city={CITIES[0]} className="md:col-span-7 md:row-span-2" size="lg" index={0} />
            <BentoTile city={CITIES[1]} className="md:col-span-5" index={1} />
            <Reveal delay={0.15} className="md:col-span-3 bg-[var(--ink)] text-[var(--paper)] p-6 flex flex-col justify-between">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-60">N° 003</p>
              <p className="font-display text-2xl leading-tight italic-display">
                &ldquo;We slept here so you could too.&rdquo;
              </p>
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-60">— The Editors</p>
            </Reveal>
            <BentoTile city={CITIES[2]} className="md:col-span-2" index={2} />
          </div>
        </section>

        {/* ── FILM STRIP ───────────────────────────────────────────── */}
        <FilmStrip destinations={DESTINATIONS} />

        {/* ── PINNED DESTINATIONS — GSAP-powered ─────────────────── */}
        <div ref={pinSectionRef} className="relative bg-[var(--ink)]">
          <div ref={pinInnerRef} className="h-screen w-full overflow-hidden bg-[var(--ink)] relative">
            {CITIES.map((city, i) => (
              <motion.div
                key={city.slug}
                className="absolute inset-0"
                animate={{
                  opacity: activeCity === i ? 1 : 0,
                  scale: activeCity === i ? 1 : 1.06,
                }}
                transition={{ duration: 1.0, ease: easeOutExpo }}
              >
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/35 to-[var(--ink)]/40 z-10" />
              </motion.div>
            ))}

            <div className="absolute inset-0 flex flex-col text-[var(--paper)] z-20">
              <div className="px-6 md:px-10 pt-8 md:pt-12 max-w-[1500px] mx-auto w-full flex items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase opacity-80">
                <span>Destinations · Vol. I</span>
                <span>{String(activeCity + 1).padStart(2, "0")} / {String(CITIES.length).padStart(2, "0")}</span>
              </div>

              <div className="flex-1 flex items-center px-6 md:px-10">
                <div className="w-full max-w-[1500px] mx-auto grid md:grid-cols-12 gap-8 items-end">
                  <div className="md:col-span-8 relative min-h-[260px] md:min-h-[420px]">
                    {CITIES.map((city, i) => (
                      <motion.div
                        key={city.slug}
                        className="absolute inset-0"
                        animate={{
                          opacity: activeCity === i ? 1 : 0,
                          y: activeCity === i ? 0 : 30,
                        }}
                        transition={{ duration: 0.7, ease: easeOutExpo }}
                      >
                        <p className="font-mono text-[11px] tracking-[0.32em] uppercase mb-6" style={{ color: city.accentHex }}>
                          {city.tagline}
                        </p>
                        <h3 className="font-display text-[clamp(4rem,13vw,13rem)] leading-[0.84] tracking-[-0.03em]">
                          {city.name.split("").map((c, ci) => (
                            <motion.span
                              key={ci}
                              className="inline-block"
                              animate={
                                activeCity === i
                                  ? { y: 0, opacity: 1 }
                                  : { y: 30, opacity: 0 }
                              }
                              transition={{ duration: 0.6, ease: easeOutExpo, delay: activeCity === i ? ci * 0.04 : 0 }}
                            >
                              {c === " " ? " " : c}
                            </motion.span>
                          ))}
                        </h3>
                        <p className="font-display italic text-2xl md:text-3xl mt-4 opacity-80" style={{ color: city.accentHex }}>
                          {city.native}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="md:col-span-4 relative md:pl-6 md:border-l border-white/15 min-h-[200px]">
                    {CITIES.map((city, i) => (
                      <motion.div
                        key={city.slug}
                        className="absolute inset-0 space-y-5"
                        animate={{
                          opacity: activeCity === i ? 1 : 0,
                          x: activeCity === i ? 0 : 20,
                        }}
                        transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
                      >
                        <p className="leading-relaxed pretty">{city.desc}</p>
                        <div className="space-y-2.5 font-mono text-[10px] tracking-widest uppercase opacity-80">
                          <div className="flex justify-between border-b border-white/15 pb-2">
                            <span>Coordinate</span><span>{city.coordinate}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/15 pb-2">
                            <span>Stays</span><span>{city.listings} curated</span>
                          </div>
                        </div>
                        <Link
                          href={`/destinations/${city.slug}`}
                          className="inline-flex items-center gap-3 group text-sm"
                          style={{ color: city.accentHex }}
                        >
                          <span>Wander {city.name}</span>
                          <span className="w-7 h-7 rounded-full border flex items-center justify-center transition-transform group-hover:translate-x-1" style={{ borderColor: city.accentHex }}>→</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 md:px-10 pb-8 md:pb-12 max-w-[1500px] mx-auto w-full">
                <div className="flex gap-3">
                  {CITIES.map((city, i) => (
                    <div key={city.slug} className="flex-1 h-[2px] relative">
                      <span className="absolute inset-0 bg-white/15" />
                      <motion.span
                        className="absolute inset-0 origin-left"
                        style={{ background: city.accentHex }}
                        animate={{ scaleX: i < activeCity ? 1 : i === activeCity ? 0.6 : 0 }}
                        transition={{ duration: 0.5, ease: easeOutExpo }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] tracking-[0.3em] uppercase opacity-60 text-center">
                  Scroll to wander
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PRINCIPLES ──────────────────────────────────────────── */}
        <section className="bg-[var(--paper-soft)] border-y border-[var(--ink)]">
          <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-32 md:py-44">
            <div className="grid md:grid-cols-12 gap-8 mb-16">
              <div className="md:col-span-3">
                <Reveal>
                  <p className="eyebrow">/02 · Principles</p>
                </Reveal>
              </div>
              <div className="md:col-span-9">
                <RevealLines
                  as="h2"
                  className="font-display text-[clamp(2.4rem,5.5vw,6rem)] leading-[0.92] tracking-[-0.025em]"
                  lines={[
                    <span key="1">Four ideas</span>,
                    <span key="2">we keep <em className="italic-display text-[var(--forest)]">close</em>.</span>,
                  ]}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 border-t border-l border-[var(--ink)]">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.no} delay={i * 0.07}>
                  <div className="group p-10 md:p-14 border-r border-b border-[var(--ink)] relative overflow-hidden hover:bg-[var(--ink-soft)] hover:text-[var(--paper)] transition-colors duration-500">
                    <div className="absolute -right-4 -top-4 font-display text-[10rem] leading-none italic opacity-[0.05] group-hover:opacity-[0.15]">
                      {p.no}
                    </div>
                    <p className="font-mono text-xs tracking-[0.32em] uppercase mb-6">{p.no}</p>
                    <h3 className="font-display text-2xl md:text-3xl mb-5 leading-snug">
                      {p.title}
                    </h3>
                    <p className="leading-relaxed pretty opacity-80 max-w-md">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONCIERGE PREVIEW ──────────────────────────────────── */}
        <section className="py-32 md:py-44 max-w-[1500px] mx-auto px-6 md:px-10 bg-[var(--paper)]">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <p className="eyebrow mb-6">/03 · The Concierge</p>
              </Reveal>
              <RevealLines
                as="h2"
                className="font-display text-[clamp(2.4rem,5.5vw,6rem)] leading-[0.92] tracking-[-0.025em] mb-8"
                lines={[
                  <span key="1">Speak. It will</span>,
                  <span key="2"><em className="italic-display text-[var(--terra)]">listen</em>.</span>,
                ]}
              />
              <Reveal delay={0.15}>
                <p className="text-[var(--ink-soft)] text-lg leading-relaxed mb-10 max-w-md pretty">
                  No forms. No filters. Tell the concierge exactly what you want — quiet,
                  walkable, near a temple, under £200 — and it curates from{" "}
                  {STATS[0].value}+ hand-picked stays.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <Link
                  href="/chat"
                  className="group inline-flex items-center gap-2 pl-7 pr-1.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-all"
                >
                  Try the concierge
                  <span className="w-9 h-9 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300">→</span>
                </Link>
              </Reveal>
            </div>

            <Reveal delay={0.2} className="lg:col-span-7">
              <ChatPreview />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="relative py-32 md:py-56 border-t border-[var(--ink)] overflow-hidden bg-[var(--paper)]">
          <div className="absolute inset-0 grid-lines opacity-50" />
          <div className="relative max-w-[1500px] mx-auto px-6 md:px-10 text-center">
            <Reveal>
              <p className="eyebrow mb-10">Now boarding · Concierge online</p>
            </Reveal>
            <RevealLines
              as="h2"
              className="font-display leading-[0.86] tracking-[-0.03em] text-[clamp(3.5rem,12vw,12rem)] mb-14"
              lines={[
                <span key="1">Your next</span>,
                <span key="2"><em className="italic-display text-[var(--terra)]">arrival</em> awaits.</span>,
              ]}
            />
            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <Link
                  href="/chat"
                  className="group inline-flex items-center gap-2 pl-8 pr-1.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-all"
                >
                  Begin a conversation
                  <span className="w-10 h-10 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300">→</span>
                </Link>
                <Link
                  href="/explore"
                  className="px-8 py-4 rounded-full text-sm font-medium border border-[var(--ink)] hover:bg-[var(--ink-soft)] hover:text-[var(--paper)] transition-all"
                >
                  Browse all stays
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="border-t border-[var(--ink)] py-12 bg-[var(--paper-soft)]">
          <div className="max-w-[1500px] mx-auto px-6 md:px-10 grid md:grid-cols-3 gap-8 items-center">
            <div className="font-display text-2xl">
              Stay<em className="italic-display">Bot</em>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)] text-center font-mono tracking-[0.32em] uppercase">
              © 2025 · A Living Atlas · Made with care
            </p>
            <div className="flex items-center justify-end gap-6 text-xs text-[var(--ink-muted)]">
              <Link href="/destinations" className="hover:text-[var(--ink)] transition-colors">Destinations</Link>
              <Link href="/explore" className="hover:text-[var(--ink)] transition-colors">Stays</Link>
              <Link href="/chat" className="hover:text-[var(--ink)] transition-colors">Concierge</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function BentoTile({ city, className = "", size = "md", index = 0 }: { city: typeof CITIES[number]; className?: string; size?: "lg" | "md"; index?: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { damping: 28, stiffness: 300 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { damping: 28, stiffness: 300 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() { mx.set(0); my.set(0); }

  return (
    <Reveal delay={index * 0.08} className={className}>
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 900 }}
        className="relative w-full h-full"
      >
        <Link
          href={`/destinations/${city.slug}`}
          className="group relative block w-full h-full overflow-hidden img-grain"
          style={{ transformStyle: "preserve-3d" }}
        >
          <Image
            src={city.image}
            alt={city.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/75 via-transparent to-[var(--ink)]/10" />
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-soft-light bg-gradient-to-br from-white/20 via-transparent to-transparent" />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between font-mono text-[10px] tracking-[0.3em] uppercase z-10">
            <span className="text-white/90 backdrop-blur-sm bg-black/30 border border-white/10 rounded px-2 py-0.5">N° {String(index + 1).padStart(2, "0")}</span>
            <span className="text-white/90 backdrop-blur-sm bg-black/30 border border-white/10 rounded px-2 py-0.5">{city.coordinate}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-[var(--paper)]" style={{ transform: "translateZ(20px)" }}>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2 opacity-90" style={{ color: city.accentHex }}>
              {city.tagline}
            </p>
            <h3 className={`font-display ${size === "lg" ? "text-5xl md:text-7xl" : "text-3xl md:text-4xl"} leading-[0.9] tracking-tight`}>
              {city.name}
            </h3>
          </div>
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
            →
          </div>
        </Link>
      </motion.div>
    </Reveal>
  );
}

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
      className={`py-10 px-6 md:px-10 ${index > 0 ? "border-l border-[var(--ink)]" : ""} relative group hover:bg-[var(--paper-soft)] transition-colors duration-300`}
    >
      <div className="flex items-baseline gap-0.5 mb-1">
        <motion.span className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tight tabular-nums">
          {rounded}
        </motion.span>
        <span className="font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-none text-[var(--ochre)]">
          {stat.suffix}
        </span>
      </div>
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">{stat.label}</p>
    </div>
  );
}
