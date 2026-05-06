"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const ParticleField = dynamic(() => import("@/components/three/ParticleField"), {
  ssr: false,
  loading: () => null,
});

const CITIES = [
  {
    slug: "bangkok",
    name: "Bangkok",
    tagline: "City of Angels",
    desc: "Ancient temples meet modern skyline in Thailand's vibrant capital.",
    color: "#D4A959",
    listings: 180,
    gradient: "from-amber-900/40 to-orange-950/60",
  },
  {
    slug: "london",
    name: "London",
    tagline: "The Great Metropolis",
    desc: "History, culture, and cosmopolitan energy across the Thames.",
    color: "#8BA5C4",
    listings: 165,
    gradient: "from-blue-950/50 to-slate-900/60",
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    tagline: "Where Mountains Meet the Sea",
    desc: "Dramatic landscapes and world-class wine country await.",
    color: "#A8C5A0",
    listings: 105,
    gradient: "from-emerald-950/50 to-teal-950/60",
  },
];

const FEATURES = [
  {
    num: "01",
    title: "Conversational AI",
    desc: "Simply tell the AI what you're looking for — it understands natural language, context, and even vague preferences.",
    icon: "✦",
  },
  {
    num: "02",
    title: "Smart Filtering",
    desc: "450+ curated properties filtered in real time by price, guests, type, and neighborhood — with instant results.",
    icon: "◈",
  },
  {
    num: "03",
    title: "Memory & Preferences",
    desc: "Your AI concierge remembers your taste. Return visits start where you left off, every time.",
    icon: "◎",
  },
  {
    num: "04",
    title: "Complete Trip Planning",
    desc: "From arrival to checkout: recommendations, local tips, calendar blocking, and full booking flow.",
    icon: "⬡",
  },
];

const STATS = [
  { value: 450, label: "Curated Properties", suffix: "+" },
  { value: 3, label: "World Cities", suffix: "" },
  { value: 98, label: "Guest Satisfaction", suffix: "%" },
  { value: 24, label: "AI Availability", suffix: "/7" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1800;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.2 });

      tl.from(".hero-eyebrow", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      })
        .from(
          ".hero-title-char",
          {
            y: 120,
            opacity: 0,
            duration: 1.0,
            stagger: 0.04,
            ease: "power4.out",
          },
          "-=0.4"
        )
        .from(
          ".hero-subtitle",
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.5"
        )
        .from(
          ".hero-cta",
          {
            y: 20,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
          },
          "-=0.4"
        )
        .from(
          ".hero-scroll-hint",
          {
            opacity: 0,
            duration: 0.8,
          },
          "-=0.2"
        );

      gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".feature-card").forEach((el, i) => {
        gsap.from(el, {
          y: 80,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".city-card").forEach((el, i) => {
        gsap.from(el, {
          x: i % 2 === 0 ? -60 : 60,
          opacity: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

      gsap.from(".divider-line", {
        scaleX: 0,
        duration: 1.2,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: ".divider-line",
          start: "top 90%",
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="bg-[var(--bg-void)] text-[var(--text-primary)] overflow-x-hidden">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-6xl mx-auto px-6 text-center"
        >
          <p className="hero-eyebrow inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-8">
            <span className="w-8 h-px bg-[var(--gold)]" />
            AI-Powered Accommodation
            <span className="w-8 h-px bg-[var(--gold)]" />
          </p>

          <h1 className="font-display text-[clamp(4rem,12vw,10rem)] leading-[0.9] tracking-tight overflow-hidden mb-8">
            {"Stay".split("").map((c, i) => (
              <span key={i} className="hero-title-char inline-block">
                {c}
              </span>
            ))}
            <span className="hero-title-char inline-block text-[var(--gold)]">.</span>
            <br />
            {"Anywhere".split("").map((c, i) => (
              <span key={i} className="hero-title-char inline-block">
                {c}
              </span>
            ))}
            <br />
            <span className="gradient-gold">
              {"Beautifully".split("").map((c, i) => (
                <span key={i} className="hero-title-char inline-block">
                  {c}
                </span>
              ))}
            </span>
          </h1>

          <p className="hero-subtitle max-w-xl mx-auto text-lg text-[var(--text-secondary)] leading-relaxed mb-12">
            Your personal AI concierge for extraordinary stays in Bangkok, London,
            and Cape Town. Just tell it what you want.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="hero-cta group relative px-8 py-4 bg-[var(--gold)] text-[var(--bg-void)] rounded-full font-medium text-sm tracking-wide hover:bg-[var(--gold-light)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(201,169,110,0.5)] overflow-hidden"
            >
              <span className="relative z-10">Talk to AI Concierge</span>
            </Link>
            <Link
              href="/explore"
              className="hero-cta px-8 py-4 rounded-full text-sm font-medium tracking-wide border border-[var(--border-bright)] text-[var(--text-primary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all duration-300"
            >
              Browse Properties
            </Link>
          </div>
        </motion.div>

        {/* Particle field */}
        <ParticleField className="absolute inset-0 z-0" />

        {/* Radial glow */}
        <div className="absolute inset-0 z-0 bg-radial-[at_50%_60%] from-[rgba(201,169,110,0.08)] to-transparent" />

        {/* Scroll hint */}
        <div className="hero-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)]">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[var(--gold)] to-transparent"
          />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="py-20 border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center reveal-up">
                <div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-[var(--gold)] leading-none mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs tracking-widest uppercase text-[var(--text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES ───────────────────────────────────────────── */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="reveal-up mb-16 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-4">
            Destinations
          </p>
          <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] text-[var(--text-primary)] leading-tight">
            Three cities.
            <br />
            <em className="text-[var(--gold)]">Infinite possibilities.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CITIES.map((city, i) => (
            <Link
              key={city.slug}
              href={`/explore?city=${city.name}`}
              className={`city-card group relative rounded-2xl overflow-hidden border border-[var(--border)] h-[480px] flex flex-col justify-end p-8 bg-[var(--bg-card)] hover:border-[rgba(201,169,110,0.3)] transition-all duration-500 hover:shadow-[0_0_60px_rgba(201,169,110,0.08)]`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${city.gradient} opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />

              {/* Floating number */}
              <span
                className="absolute top-8 right-8 font-display text-[6rem] leading-none font-bold opacity-5 group-hover:opacity-10 transition-opacity"
                style={{ color: city.color }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Grid decoration */}
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(201,169,110,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(201,169,110,0.8)_1px,transparent_1px)] bg-[size:40px_40px]" />

              {/* Content */}
              <div className="relative z-10">
                <p
                  className="text-xs tracking-[0.25em] uppercase mb-2 font-medium"
                  style={{ color: city.color }}
                >
                  {city.tagline}
                </p>
                <h3 className="font-display text-4xl text-[var(--text-primary)] mb-3 group-hover:text-white transition-colors">
                  {city.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {city.desc}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    {city.listings} properties
                  </span>
                  <motion.span
                    className="text-[var(--gold)] text-sm font-medium"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    Explore →
                  </motion.span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="py-32 bg-[var(--bg-deep)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="reveal-up text-center mb-20">
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-4">
              How it works
            </p>
            <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] text-[var(--text-primary)] leading-tight">
              Intelligence built
              <br />
              <em className="text-[var(--gold)]">for travelers.</em>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="feature-card group p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[rgba(201,169,110,0.3)] hover:bg-[var(--bg-elevated)] transition-all duration-400 hover:shadow-[0_0_40px_rgba(201,169,110,0.06)]"
              >
                <div className="w-12 h-12 rounded-xl border border-[var(--border-bright)] flex items-center justify-center mb-6 text-[var(--gold)] text-xl group-hover:border-[var(--gold)] group-hover:bg-[rgba(201,169,110,0.08)] transition-all duration-300">
                  {f.icon}
                </div>
                <p className="text-[var(--gold-dim)] text-xs tracking-widest mb-2">
                  {f.num}
                </p>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHAT DEMO ────────────────────────────────────────── */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal-up">
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-6">
              AI Concierge
            </p>
            <h2 className="font-display text-[clamp(2rem,4vw,4rem)] text-[var(--text-primary)] leading-tight mb-6">
              Just describe
              <br />
              your perfect stay.
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-md">
              No forms. No filters. Just tell the AI what you want in plain
              English — "cozy studio near markets under $80" — and it finds it
              instantly.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--gold)] text-[var(--bg-void)] rounded-full text-sm font-medium hover:bg-[var(--gold-light)] transition-colors hover:shadow-[0_0_30px_rgba(201,169,110,0.4)]"
            >
              Try the AI Concierge
              <span>→</span>
            </Link>
          </div>

          <ChatPreview />
        </div>
      </section>

      {/* ── DIVIDER ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="divider-line h-px bg-gradient-to-r from-transparent via-[var(--border-bright)] to-transparent origin-left" />
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-40 text-center">
        <div className="max-w-3xl mx-auto px-6 reveal-up">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-6">
            Ready to travel?
          </p>
          <h2 className="font-display text-[clamp(3rem,7vw,7rem)] text-[var(--text-primary)] leading-[0.9] mb-10">
            Your next great
            <br />
            <span className="gradient-gold">adventure awaits.</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="px-8 py-4 bg-[var(--gold)] text-[var(--bg-void)] rounded-full font-medium text-sm hover:bg-[var(--gold-light)] transition-all hover:shadow-[0_0_50px_rgba(201,169,110,0.4)]"
            >
              Talk to AI Concierge
            </Link>
            <Link
              href="/explore"
              className="px-8 py-4 rounded-full text-sm font-medium border border-[var(--border-bright)] text-[var(--text-primary)] hover:border-[var(--gold)] transition-all"
            >
              Browse All Properties
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl text-[var(--text-primary)]">
            Stay<span className="text-[var(--gold)]">Bot</span>
          </span>
          <p className="text-sm text-[var(--text-muted)]">
            © 2025 StayBot. AI-powered accommodation discovery.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ChatPreview() {
  const messages = [
    {
      role: "user" as const,
      text: "I need a cozy place in Bangkok near temples, max $70/night for 2",
    },
    {
      role: "ai" as const,
      text: "I found 3 perfect matches near the Grand Palace district. Here's my top pick: The Golden Loft — a charming boutique suite at $65/night with a rooftop terrace and stunning temple views. Would you like to see more details?",
    },
    {
      role: "user" as const,
      text: "Yes! And can we do dates Dec 15–20?",
    },
    {
      role: "ai" as const,
      text: "The Golden Loft is available Dec 15–20 (5 nights). Total: $325. Free cancellation until Dec 10. Shall I check you in?",
    },
  ];

  return (
    <div className="reveal-up">
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] opacity-50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] opacity-50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] opacity-50" />
          </div>
          <span className="text-xs text-[var(--text-muted)] flex-1 text-center">
            StayBot AI Concierge
          </span>
        </div>

        {/* Messages */}
        <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto hide-scrollbar">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              viewport={{ once: true }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "ai" && (
                <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <span className="text-[var(--gold)] text-[8px]">S</span>
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--gold)]/15 text-[var(--text-primary)] rounded-tr-sm border border-[var(--gold)]/20"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-tl-sm border border-[var(--border)]"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-[var(--gold)] text-[8px]">S</span>
            </div>
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 0.2, 0.4].map((d) => (
                  <motion.div
                    key={d}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-[var(--border)] flex items-center gap-3">
          <div className="flex-1 bg-[var(--bg-elevated)] rounded-full px-4 py-2 text-xs text-[var(--text-muted)]">
            Ask about your next stay…
          </div>
          <button className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-[var(--bg-void)] hover:bg-[var(--gold-light)] transition-colors">
            <span className="text-xs">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
