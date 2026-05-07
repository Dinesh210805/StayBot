"use client";

import { use, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import Magnetic from "@/components/fx/Magnetic";
import Marquee from "@/components/fx/Marquee";
import VideoBackground from "@/components/fx/VideoBackground";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const d = getDestination(slug);
  if (!d) notFound();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const otherCities = DESTINATIONS.filter((x) => x.slug !== d.slug);

  return (
    <div className="bg-[var(--bg-page)] overflow-x-hidden">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex items-end overflow-hidden"
      >
        <motion.div style={{ scale: heroScale }} className="absolute inset-0 z-0">
          {d.video ? (
            <VideoBackground
              src={d.video}
              poster={d.hero}
              overlayOpacity={0}
            />
          ) : (
            <Image
              src={d.hero}
              alt={d.name}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          )}
        </motion.div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[var(--bg-void)] via-[var(--bg-void)]/50 to-[var(--bg-void)]/40" />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 70%, ${d.accent}26 0%, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 z-[2] grid-lines opacity-30" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 w-full max-w-[1400px] mx-auto px-6 pb-16 md:pb-28"
        >
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-9">
              <Reveal>
                <p
                  className="eyebrow mb-6"
                  style={{ color: d.accent }}
                >
                  {d.tagline}
                </p>
              </Reveal>
              <RevealLines
                as="h1"
                className="font-display text-[clamp(4.5rem,16vw,16rem)] leading-[0.82] tracking-[-0.04em]"
                lines={[d.name]}
              />
              <Reveal delay={0.3}>
                <p
                  className="font-display italic text-2xl md:text-4xl mt-4 opacity-70"
                  style={{ color: d.accent }}
                >
                  {d.native}
                </p>
              </Reveal>
            </div>
            <div className="md:col-span-3 space-y-3 font-mono text-[11px] tracking-wider uppercase text-[var(--text-secondary)]">
              <Reveal delay={0.4}>
                <div className="border-t border-[var(--border-bright)] pt-3 flex justify-between">
                  <span>Coordinate</span>
                  <span className="text-[var(--text-primary)]">{d.coordinate}</span>
                </div>
              </Reveal>
              <Reveal delay={0.5}>
                <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                  <span>Best time</span>
                  <span className="text-[var(--text-primary)]">{d.bestTime}</span>
                </div>
              </Reveal>
              <Reveal delay={0.6}>
                <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                  <span>Language</span>
                  <span className="text-[var(--text-primary)]">{d.language}</span>
                </div>
              </Reveal>
              <Reveal delay={0.7}>
                <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                  <span>Currency</span>
                  <span style={{ color: d.accent }}>{d.currency}</span>
                </div>
              </Reveal>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-[var(--text-muted)]">
            Continue
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-10"
            style={{ background: `linear-gradient(to bottom, ${d.accent}, transparent)` }}
          />
        </motion.div>
      </section>

      {/* ── INTRO STATEMENT ────────────────────────────────────────── */}
      <section className="py-32 md:py-44 max-w-[1400px] mx-auto px-6">
        <div className="grid md:grid-cols-12 gap-12">
          <Reveal className="md:col-span-3">
            <p className="eyebrow" style={{ color: d.accent }}>
              /01 · Overture
            </p>
          </Reveal>
          <div className="md:col-span-9">
            <p className="font-display text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.25] pretty">
              {d.intro}
            </p>
          </div>
        </div>
      </section>

      {/* ── STORY (long-form prose) ─────────────────────────────── */}
      <section className="bg-[var(--bg-deep)] py-32 md:py-44 relative">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="relative max-w-[1400px] mx-auto px-6 grid md:grid-cols-12 gap-12">
          <Reveal className="md:col-span-3">
            <p className="eyebrow" style={{ color: d.accent }}>
              /02 · A day, briefly
            </p>
          </Reveal>
          <div className="md:col-span-9 space-y-10 max-w-3xl">
            {d.story.map((paragraph, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <p className="text-[clamp(1.05rem,1.4vw,1.3rem)] leading-[1.7] text-[var(--text-secondary)] pretty">
                  <span className="font-display italic text-[var(--text-primary)] mr-2 text-2xl" style={{ color: d.accent }}>
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEIGHBORHOODS ───────────────────────────────────────── */}
      <section className="py-32 md:py-44 max-w-[1400px] mx-auto px-6">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <Reveal className="md:col-span-3">
            <p className="eyebrow" style={{ color: d.accent }}>
              /03 · Neighborhoods
            </p>
          </Reveal>
          <div className="md:col-span-9">
            <RevealLines
              as="h2"
              className="font-display text-[clamp(2.2rem,4.6vw,5rem)] leading-[0.98] tracking-[-0.02em]"
              lines={["Three places to", <span key="b">begin <em className="italic" style={{ color: d.accent }}>your night</em>.</span>]}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {d.neighborhoods.map((n, i) => (
            <Reveal key={n.name} delay={i * 0.1}>
              <div className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--border-bright)] transition-colors">
                <Image
                  src={n.image}
                  alt={n.name}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] via-[var(--bg-void)]/30 to-transparent" />
                <div className="absolute top-6 left-6 right-6 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase text-white/70">
                  <span>{String(i + 1).padStart(2, "0")} / 03</span>
                  <span style={{ color: d.accent }}>↗</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <h3 className="font-display text-3xl mb-3">{n.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed pretty">
                    {n.vibe}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── RITUALS / DAY-IN-THE-LIFE ──────────────────────────── */}
      <section
        className="py-32 md:py-44 relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-page) 100%)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none drift opacity-50"
          style={{
            background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${d.accent}14 0%, transparent 70%)`,
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-6 grid md:grid-cols-12 gap-12">
          <Reveal className="md:col-span-3">
            <p className="eyebrow" style={{ color: d.accent }}>
              /04 · A small itinerary
            </p>
          </Reveal>
          <div className="md:col-span-9">
            <RevealLines
              as="h2"
              className="font-display text-[clamp(2.2rem,4.6vw,5rem)] leading-[0.98] tracking-[-0.02em] mb-16"
              lines={["Three", <em key="2" className="italic" style={{ color: d.accent }}>moments</em>, "we'd plan."]}
            />
            <div className="space-y-px bg-[var(--border)]">
              {d.rituals.map((r, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="bg-[var(--bg-page)] py-8 md:py-10 grid grid-cols-12 gap-6 items-baseline group hover:bg-[var(--bg-card)] transition-colors px-4 -mx-4 rounded-xl">
                    <p
                      className="col-span-3 md:col-span-2 font-mono text-sm tracking-widest"
                      style={{ color: d.accent }}
                    >
                      {r.time}
                    </p>
                    <h3 className="col-span-9 md:col-span-3 font-display text-2xl md:text-3xl">{r.place}</h3>
                    <p className="col-span-12 md:col-span-7 text-[var(--text-secondary)] leading-relaxed pretty">
                      {r.note}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY MARQUEE ────────────────────────────────────── */}
      <section className="py-20 overflow-hidden border-y border-[var(--border)]">
        <Marquee duration={60}>
          {d.gallery.concat(d.gallery).map((img, i) => (
            <div key={i} className="relative w-[320px] md:w-[420px] aspect-[3/4] rounded-2xl overflow-hidden flex-shrink-0">
              <Image
                src={img}
                alt=""
                fill
                className="object-cover"
                sizes="420px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)]/40 to-transparent" />
            </div>
          ))}
        </Marquee>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-32 md:py-44 max-w-[1400px] mx-auto px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none drift opacity-60"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${d.accent}1F 0%, transparent 70%)`,
          }}
        />
        <div className="relative">
          <Reveal>
            <p className="eyebrow mb-8" style={{ color: d.accent }}>
              Ready when you are
            </p>
          </Reveal>
          <RevealLines
            as="h2"
            className="font-display leading-[0.86] tracking-[-0.03em] text-[clamp(3rem,9vw,9rem)] mb-12"
            lines={[<span key="b">Sleep <em className="italic" style={{ color: d.accent }}>here</em>.</span>]}
          />
          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Magnetic strength={0.3}>
                <Link
                  href={`/explore?city=${d.name}`}
                  className="group inline-flex items-center gap-2 pl-7 pr-1.5 py-1.5 rounded-full text-sm font-medium text-[var(--bg-void)] transition-all duration-300"
                  style={{ background: d.accent }}
                >
                  Browse stays in {d.name}
                  <span className="w-10 h-10 rounded-full bg-[var(--bg-void)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300" style={{ color: d.accent }}>
                    →
                  </span>
                </Link>
              </Magnetic>
              <Link
                href="/chat"
                className="px-8 py-4 rounded-full text-sm font-medium border border-[var(--border-bright)] hover:text-[var(--text-primary)] text-[var(--text-secondary)] transition-all"
                style={{
                  ["--accent" as string]: d.accent,
                }}
              >
                Ask the concierge instead
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── OTHER DESTINATIONS ────────────────────────────────── */}
      <section className="border-t border-[var(--border)] py-24 max-w-[1400px] mx-auto px-6">
        <div className="flex items-baseline justify-between mb-10">
          <p className="eyebrow">Continue the atlas</p>
          <Link href="/destinations" className="text-xs text-[var(--text-secondary)] hover:text-[var(--amber)] transition-colors">
            All destinations →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {otherCities.map((o) => (
            <Link
              key={o.slug}
              href={`/destinations/${o.slug}`}
              className="group relative aspect-[16/9] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--border-bright)] transition-colors"
            >
              <Image
                src={o.hero}
                alt={o.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] via-[var(--bg-void)]/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="eyebrow mb-2" style={{ color: o.accent }}>
                  {o.tagline}
                </p>
                <h3 className="font-display text-4xl">{o.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
