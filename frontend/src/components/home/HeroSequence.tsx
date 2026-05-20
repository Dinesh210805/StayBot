"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FRAME_COUNT = 180;
const FRAME_BASE = "/hero-frames";
const FRAME_EXT = "jpg";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

// curve = [fadeInStart, holdStart, holdEnd, fadeOutEnd] — overlapping crossfades
const COPY_STOPS = [
  { curve: [0, 0.04, 0.27, 0.36] as const, lines: ["Find", "your", "threshold."] },
  { curve: [0.28, 0.36, 0.60, 0.68] as const, lines: ["Every door", "opens", "a story."] },
  { curve: [0.62, 0.70, 1.0, 1.0] as const, lines: ["We curate", "the ones worth", "waking up in."] },
];
const STOP_THRESHOLDS = [0, 0.32, 0.65];

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function remap(v: number, a: number, b: number) {
  if (b === a) return v >= b ? 1 : 0;
  return clamp01((v - a) / (b - a));
}
function stopOpacity(p: number, curve: readonly [number, number, number, number]) {
  const [fadeInStart, holdStart, holdEnd, fadeOutEnd] = curve;
  if (p < fadeInStart) return 0;
  if (p < holdStart) return remap(p, fadeInStart, holdStart);
  if (p <= holdEnd) return 1;
  if (p < fadeOutEnd) return 1 - remap(p, holdEnd, fadeOutEnd);
  return 0;
}

function paintFallback(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const t = clamp01(progress);
  g.addColorStop(0, `rgba(242,235,219,${0.95 - t * 0.4})`);
  g.addColorStop(0.5, `rgba(228,206,162,${0.9 - t * 0.3})`);
  g.addColorStop(1, `rgba(194,90,56,${0.55 + t * 0.25})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rg = ctx.createRadialGradient(w * 0.5, h * 0.55, w * 0.2, w * 0.5, h * 0.55, w * 0.8);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(1, "rgba(14,17,16,0.35)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
}

export default function HeroSequence() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedRef = useRef(false);
  const useFallbackRef = useRef(false);
  const progressRef = useRef(0);
  const stopIdxRef = useRef(0);

  // Direct DOM refs — driven by GSAP at 60fps without React re-renders
  const progressBarRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [stopIdx, setStopIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isMobile || prefersReducedMotion) return;
    const frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    framesRef.current = frames;
    let firstLoaded = false;
    let firstErrored = false;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      const idx = String(i + 1).padStart(3, "0");
      img.src = `${FRAME_BASE}/frame_${idx}.${FRAME_EXT}`;
      img.onload = () => {
        frames[i] = img;
        if (i === 0 && !firstLoaded) {
          firstLoaded = true;
          loadedRef.current = true;
          drawFrame(0);
        }
      };
      img.onerror = () => {
        if (i === 0 && !firstErrored) {
          firstErrored = true;
          useFallbackRef.current = true;
          loadedRef.current = true;
          drawFrame(0);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, prefersReducedMotion]);

  function drawFrame(p: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (
      canvas.width !== Math.floor(rect.width * dpr) ||
      canvas.height !== Math.floor(rect.height * dpr)
    ) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
    const w = canvas.width;
    const h = canvas.height;

    if (useFallbackRef.current) {
      paintFallback(ctx, w, h, p);
      return;
    }

    const frameIdx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(p * (FRAME_COUNT - 1))));
    const img = framesRef.current[frameIdx];
    if (!img || !img.complete || img.naturalWidth === 0) {
      paintFallback(ctx, w, h, p);
      return;
    }

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cr = w / h;
    const ir = iw / ih;
    let dw = w, dh = h, dx = 0, dy = 0;
    if (ir > cr) {
      dh = h; dw = h * ir; dx = (w - dw) / 2;
    } else {
      dw = w; dh = w / ir; dy = (h - dh) / 2;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (isMobile || prefersReducedMotion) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=220%",
        pin: sticky,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1.2,
        onUpdate: (self) => {
          const p = self.progress;
          progressRef.current = p;

          // Canvas frame + subtle zoom (compositor-only, no layout)
          if (loadedRef.current) drawFrame(p);
          if (canvasRef.current) {
            canvasRef.current.style.transform = `scale(${1 + p * 0.05})`;
          }

          // Progress bar — scaleX from left
          if (progressBarRef.current) {
            progressBarRef.current.style.transform = `scaleX(${p})`;
          }

          // Vignette deepens as scroll progresses
          if (vignetteRef.current) {
            vignetteRef.current.style.opacity = String(0.35 + p * 0.38);
          }

          // Copy overlays — overlapping opacity + lift, all via direct DOM
          COPY_STOPS.forEach((stop, i) => {
            const el = copyRefs.current[i];
            if (!el) return;
            const o = stopOpacity(p, stop.curve);
            el.style.opacity = String(o);
            el.style.transform = `translateY(${(1 - o) * 24}px)`;
          });

          // CTA slides up near end of sequence
          if (ctaRef.current) {
            const ctaO = remap(p, 0.82, 0.96);
            ctaRef.current.style.opacity = String(ctaO);
            ctaRef.current.style.transform = `translateY(${(1 - ctaO) * 20}px)`;
          }

          // React state only when chapter changes (max 3 times in entire scroll)
          const newIdx = STOP_THRESHOLDS.reduce((acc, t, i) => (p >= t ? i : acc), 0);
          if (newIdx !== stopIdxRef.current) {
            stopIdxRef.current = newIdx;
            setStopIdx(newIdx);
          }
        },
      });
      drawFrame(0);
    }, section);

    return () => ctx.revert();
  }, [isMobile, prefersReducedMotion]);

  // Resize — use ref so handler never goes stale
  useEffect(() => {
    if (isMobile || prefersReducedMotion) return;
    const handler = () => {
      if (loadedRef.current) drawFrame(progressRef.current);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [isMobile, prefersReducedMotion]);

  // ── Mobile / reduced-motion fallback ──────────────────────────────
  if (isMobile || prefersReducedMotion) {
    return (
      <section className="relative w-full h-[100svh] overflow-hidden bg-[var(--ink)]">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          src="/hero-fallback.mp4"
          autoPlay
          loop
          muted
          playsInline
          poster="/hero-frames/frame_001.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/30 via-transparent to-[var(--ink)]/70" />
        <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-16 text-[var(--paper)]">
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-80 mb-6">
            A Living Atlas of Stays
          </p>
          <h1 className="font-display leading-[0.9] tracking-[-0.025em] text-[clamp(3rem,11vw,5rem)]">
            <span className="block">Find your</span>
            <em className="italic-display block" style={{ color: "var(--ochre-bright)" }}>
              threshold.
            </em>
          </h1>
          <p className="mt-6 text-sm opacity-80 max-w-[28ch]">
            We curate stays worth waking up in. Speak to the concierge.
          </p>
          <div className="mt-8">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 pl-6 pr-1 py-1 rounded-full bg-[var(--paper)] text-[var(--ink)] text-sm font-medium"
            >
              Begin a conversation
              <span className="w-9 h-9 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ── Desktop scroll sequence ────────────────────────────────────────
  return (
    <section ref={sectionRef} className="relative w-full bg-[var(--ink)]">
      <div ref={stickyRef} className="relative h-[100svh] w-full overflow-hidden">

        {/* Canvas — zooms subtly via GSAP direct transform */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block origin-center"
          style={{ willChange: "transform" }}
          aria-hidden
        />

        {/* Animated film-grain overlay */}
        <div className="hero-grain absolute inset-0 pointer-events-none z-[1]" aria-hidden />

        {/* Radial vignette — opacity driven by scroll via ref */}
        <div
          ref={vignetteRef}
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 60%, transparent 20%, rgba(14,17,16,0.95) 100%)",
            opacity: 0.35,
            willChange: "opacity",
          }}
        />

        {/* Top-to-bottom ink scrim for text contrast */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-[var(--ink)]/55 via-transparent to-[var(--ink)]/85 pointer-events-none" />

        {/* Subtle grid lines */}
        <div className="absolute inset-0 grid-lines opacity-[0.04] pointer-events-none z-[4]" />

        {/* Top meta row */}
        <div className="absolute top-0 left-0 right-0 z-10 px-6 md:px-12 pt-32 md:pt-36 flex items-center gap-5 font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--paper)]/85">
          <span>Est · MMXXV</span>
          <span className="h-px flex-1 max-w-[80px] bg-[var(--paper)]/30" />
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra-soft)] animate-pulse" />
            Concierge online
          </span>
        </div>

        {/* Copy stack — all 3 stops rendered simultaneously, crossfaded via GSAP refs */}
        <div className="absolute inset-0 z-10 flex items-center px-6 md:px-12">
          <div className="max-w-[1500px] w-full mx-auto">
            <div
              className="relative md:max-w-[70%]"
              style={{ minHeight: "clamp(14rem, 30vw, 30rem)" }}
            >
              {COPY_STOPS.map((stop, i) => (
                <div
                  key={i}
                  ref={(el) => { copyRefs.current[i] = el; }}
                  className="absolute top-0 left-0"
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    transform: i === 0 ? "translateY(0px)" : "translateY(24px)",
                    willChange: "opacity, transform",
                    pointerEvents: "none",
                  }}
                >
                  <p className="font-mono text-[10px] tracking-[0.42em] uppercase text-[var(--paper)]/60 mb-5">
                    / Chapter {String(i + 1).padStart(2, "0")}
                  </p>
                  <h1 className="font-display leading-[0.88] tracking-[-0.03em] text-[var(--paper)]">
                    {stop.lines.map((line, li) => {
                      const isItalic = li === 1;
                      return (
                        <span
                          key={li}
                          className="block overflow-hidden"
                          style={{ paddingBottom: "0.05em" }}
                        >
                          <motion.span
                            className={`block text-[clamp(3rem,8vw,8rem)] ${
                              isItalic ? "italic-display pl-[6%]" : ""
                            }`}
                            style={isItalic ? { color: "var(--ochre-bright)" } : undefined}
                            initial={{ y: "110%" }}
                            animate={{ y: stopIdx === i ? "0%" : "110%" }}
                            transition={{
                              duration: 0.9,
                              ease: easeOutExpo,
                              delay: stopIdx === i ? li * 0.08 : 0,
                            }}
                          >
                            {line}
                          </motion.span>
                        </span>
                      );
                    })}
                  </h1>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA — slides up at p > 0.82, driven via ref */}
        <div
          ref={ctaRef}
          className="absolute bottom-24 md:bottom-28 left-6 md:left-12 z-10"
          style={{
            opacity: 0,
            transform: "translateY(20px)",
            willChange: "opacity, transform",
          }}
        >
          <Link
            href="/chat"
            className="inline-flex items-center gap-3 pl-7 pr-1.5 py-1.5 rounded-full bg-[var(--paper)] text-[var(--ink)] text-sm font-medium tracking-wide hover:bg-[var(--ochre-bright)] transition-colors duration-300"
          >
            Begin a conversation
            <span className="w-9 h-9 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center text-base">
              →
            </span>
          </Link>
        </div>

        {/* Chapter indicator — bottom-right */}
        <div className="absolute bottom-10 md:bottom-16 right-6 md:right-12 z-10 flex items-center gap-3 text-[var(--paper)]/70 font-mono text-[10px] tracking-[0.3em] uppercase">
          <span>{String(stopIdx + 1).padStart(2, "0")} / 03</span>
          <div className="flex items-center gap-1.5">
            {COPY_STOPS.map((_, i) => (
              <span
                key={i}
                className={`h-[2px] transition-all duration-500 ${
                  i === stopIdx ? "w-8 bg-[var(--ochre-bright)]" : "w-4 bg-[var(--paper)]/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scroll progress bar — scaleX driven via ref from origin-left */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-[var(--paper)]/10">
          <div
            ref={progressBarRef}
            className="h-full bg-[var(--ochre-bright)] origin-left"
            style={{ transform: "scaleX(0)", willChange: "transform" }}
          />
        </div>
      </div>
    </section>
  );
}
