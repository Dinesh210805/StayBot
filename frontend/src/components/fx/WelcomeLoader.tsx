"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const PHRASES = [
  { city: "Bangkok", phrase: "ยินดีต้อนรับ", color: "var(--terra)" },
  { city: "London", phrase: "Hello", color: "var(--forest)" },
  { city: "Cape Town", phrase: "Welkom", color: "var(--tide)" },
];

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface WelcomeLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export default function WelcomeLoader({ onComplete, duration = 3400 }: WelcomeLoaderProps) {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // FIRE A SILENT DATABASE QUERY TO WAKE UP THE NEON SERVERLESS DB!
    api.health().catch(() => { /* we don't care if it fails, just wake it up */ });

    if (sessionStorage.getItem("staybot-welcomed")) {
      setShow(false);
      onComplete?.();
    }
  }, [onComplete]);

  useEffect(() => {
    if (!show) return;
    const stepDur = duration / 3;
    const t1 = setTimeout(() => setStep(1), stepDur);
    const t2 = setTimeout(() => setStep(2), stepDur * 2);
    const t3 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("staybot-welcomed", "1");
      onComplete?.();
    }, duration);

    let raf = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      cancelAnimationFrame(raf);
    };
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            clipPath: "inset(0% 0% 100% 0%)",
            transition: { duration: 1.0, ease: easeOutExpo },
          }}
          className="fixed inset-0 z-[100] bg-[var(--paper)] flex flex-col overflow-hidden"
          style={{ cursor: "none" }}
        >
          {/* Paper grain overlay */}
          <div className="absolute inset-0 grid-lines opacity-50" />

          {/* Header bar */}
          <div className="relative z-10 px-8 md:px-12 pt-8 flex items-center justify-between">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOutExpo }}
              className="font-display text-2xl text-[var(--ink)]"
            >
              Stay<em className="italic-display">Bot</em>
            </motion.span>
            <span className="font-mono text-[10px] tracking-[0.32em] text-[var(--ink-muted)] uppercase">
              {String(Math.floor(progress * 100)).padStart(3, "0")} / 100
            </span>
          </div>

          {/* Center stage */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="eyebrow-muted mb-12"
            >
              A Living Atlas · Vol. I · 2025
            </motion.p>

            <CitySkyline step={step} />

            <div className="h-24 flex flex-col items-center justify-center mt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
                  transition={{ duration: 0.6, ease: easeOutExpo }}
                  className="text-center"
                >
                  <p
                    className="font-display text-[clamp(2.4rem,5.5vw,4.5rem)] leading-none italic"
                    style={{ color: PHRASES[step].color }}
                  >
                    {PHRASES[step].phrase}
                  </p>
                  <p className="eyebrow-muted mt-3">
                    from {PHRASES[step].city}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer progress */}
          <div className="relative z-10 px-8 md:px-12 pb-8 flex items-center gap-6">
            <div className="flex-1 h-px bg-[var(--ink-faint)] relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-[var(--ink)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tracking-[0.32em] text-[var(--ink-muted)] uppercase">
              {progress < 0.34 ? "Curating" : progress < 0.67 ? "Calibrating" : "Welcoming you"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CitySkyline({ step }: { step: number }) {
  return (
    <div className="relative w-full max-w-3xl h-[180px] flex items-end justify-center">
      <AnimatePresence mode="wait">
        {step === 0 && <BangkokSkyline key="bkk" />}
        {step === 1 && <LondonSkyline key="ldn" />}
        {step === 2 && <CapeTownSkyline key="cpt" />}
      </AnimatePresence>
    </div>
  );
}

const enter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

function Path({ d, stroke = "var(--ink)", delay = 0, fill = false, opacity = 1 }: { d: string; stroke?: string; delay?: number; fill?: boolean; opacity?: number }) {
  return (
    <motion.path
      d={d}
      fill={fill ? stroke : "none"}
      fillOpacity={fill ? 0.10 * opacity : 0}
      stroke={stroke}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={opacity}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay }}
    />
  );
}

function BangkokSkyline() {
  return (
    <motion.svg viewBox="0 0 800 180" className="w-full h-full" {...enter}>
      <motion.circle cx="400" cy="60" r="42" fill="var(--terra)" opacity="0.18"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
      <Path d="M0,150 L40,150 L60,130 L80,150 L120,150 L140,120 L170,150 L200,150 L220,130 L240,150 L300,150" stroke="var(--terra)" delay={0.1} />
      <Path d="M340,150 L360,90 L370,75 L375,40 L380,75 L390,90 L400,80 L410,90 L420,75 L425,40 L430,75 L440,90 L460,150" stroke="var(--terra)" delay={0.3} fill />
      <Path d="M460,150 L480,150 L490,135 L510,150 L540,150 L560,125 L580,150 L620,150 L640,130 L660,150 L700,150 L720,140 L750,150 L800,150" stroke="var(--terra)" delay={0.5} fill />
    </motion.svg>
  );
}

function LondonSkyline() {
  return (
    <motion.svg viewBox="0 0 800 180" className="w-full h-full" {...enter}>
      <motion.circle cx="200" cy="55" r="40" fill="var(--forest)" opacity="0.14"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
      <Path d="M280,150 L280,60 L290,50 L295,40 L298,30 L302,30 L305,40 L310,50 L320,60 L320,150" stroke="var(--forest)" delay={0.2} fill />
      <Path d="M0,150 L60,150 L80,135 L100,150 L160,150 L180,140 L220,150 L260,150 L280,150" stroke="var(--forest)" delay={0.1} />
      <Path d="M460,150 L470,55 L478,75 L484,55 L490,150" stroke="var(--forest)" delay={0.4} fill />
      <Path d="M540,150 Q545,100 555,80 Q565,100 570,150 Z" stroke="var(--forest)" delay={0.5} fill />
      <motion.circle cx="640" cy="100" r="30" fill="none" stroke="var(--forest)" strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 1.2, delay: 0.6 }} />
      <Path d="M320,150 L460,150 M490,150 L540,150 M570,150 L620,150 M670,150 L800,150" stroke="var(--forest)" delay={0.4} />
    </motion.svg>
  );
}

function CapeTownSkyline() {
  return (
    <motion.svg viewBox="0 0 800 180" className="w-full h-full" {...enter}>
      <motion.circle cx="600" cy="50" r="38" fill="var(--tide)" opacity="0.15"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
      <Path d="M0,150 L0,140 L60,130 L120,80 L180,55 L260,50 L420,52 L540,55 L580,80 L620,140 L700,150 L800,150" stroke="var(--tide)" delay={0.1} fill />
      <Path d="M0,150 L40,148 L60,138 L100,150 L140,140 L160,150 L200,148 L240,150 L280,140 L320,150 L360,145 L400,150 L440,140 L480,150 L520,145 L560,150 L620,150 L660,150 L700,148 L740,150 L800,150" stroke="var(--tide)" delay={0.3} opacity={0.8} />
    </motion.svg>
  );
}
