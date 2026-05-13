"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface PathDef {
  d: string;
  delay: number;
  dur: number;
  dashed?: boolean;
}

const SCENE0_PATHS: PathDef[] = [
  { d: "M 65 40 L 65 115 L 175 115 L 175 40 Z", delay: 0, dur: 0.7 },
  { d: "M 90 40 L 90 22 Q 120 10 150 22 L 150 40", delay: 0.2, dur: 0.4 },
  { d: "M 65 77 L 175 77", delay: 0.4, dur: 0.3 },
  { d: "M 109 70 L 109 84 L 131 84 L 131 70 Z", delay: 0.55, dur: 0.25 },
  { d: "M 84 40 L 84 77", delay: 0.7, dur: 0.2 },
  { d: "M 156 40 L 156 77", delay: 0.75, dur: 0.2 },
  { d: "M 80 122 m -6 0 a 6 6 0 1 1 12 0 a 6 6 0 1 1 -12 0", delay: 0.85, dur: 0.2 },
  { d: "M 160 122 m -6 0 a 6 6 0 1 1 12 0 a 6 6 0 1 1 -12 0", delay: 0.9, dur: 0.2 },
];

const THREAD0: PathDef = {
  d: "M 120 128 C 119 152 121 163 120 182",
  delay: 0,
  dur: 0.6,
  dashed: true,
};

const SCENE1_PATHS: PathDef[] = [
  { d: "M 120 225 m -32 0 a 32 32 0 1 1 64 0 a 32 32 0 1 1 -64 0", delay: 0, dur: 0.7 },
  { d: "M 93 239 Q 120 295 120 302 Q 120 295 147 239", delay: 0.3, dur: 0.4 },
  { d: "M 120 225 m -11 0 a 11 11 0 1 1 22 0 a 11 11 0 1 1 -22 0", delay: 0.5, dur: 0.3 },
  { d: "M 65 258 a 55 20 0 0 1 110 0", delay: 0.65, dur: 0.3 },
  { d: "M 50 270 a 70 25 0 0 1 140 0", delay: 0.78, dur: 0.3 },
];

const THREAD1: PathDef = {
  d: "M 120 312 C 119 336 121 347 120 366",
  delay: 0,
  dur: 0.6,
  dashed: true,
};

const SCENE2_PATHS: PathDef[] = [
  { d: "M 60 402 L 120 358 L 180 402", delay: 0, dur: 0.4 },
  { d: "M 143 374 L 143 352 L 162 352 L 162 388", delay: 0.15, dur: 0.3 },
  { d: "M 68 402 L 68 468 L 172 468 L 172 402", delay: 0.28, dur: 0.5 },
  { d: "M 78 440 L 100 440 L 100 418 L 78 418 Z", delay: 0.48, dur: 0.3 },
  { d: "M 78 429 L 100 429", delay: 0.55, dur: 0.2 },
  { d: "M 89 418 L 89 440", delay: 0.57, dur: 0.2 },
  { d: "M 140 440 L 162 440 L 162 418 L 140 418 Z", delay: 0.6, dur: 0.3 },
  { d: "M 140 429 L 162 429", delay: 0.68, dur: 0.2 },
  { d: "M 151 418 L 151 440", delay: 0.7, dur: 0.2 },
  { d: "M 108 468 L 108 445 Q 120 436 132 445 L 132 468", delay: 0.78, dur: 0.3 },
  { d: "M 127 456 m -3 0 a 3 3 0 1 1 6 0", delay: 0.9, dur: 0.2 },
];

const SCENE_DURATIONS = [1400, 600, 1200, 600, 1400, 2000];

const LABELS = [
  { y: 140, label: "Plan" },
  { y: 322, label: "Discover" },
  { y: 486, label: "Arrive" },
];

function AnimatedPath({
  d,
  delay,
  dur,
  stroke,
  dashed,
  loopKey,
}: PathDef & { stroke: string; loopKey: number }) {
  return (
    <motion.path
      key={`${loopKey}-${d}`}
      d={d}
      stroke={stroke}
      strokeWidth={dashed ? 1.5 : 2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? "4 6" : undefined}
      initial={{ pathLength: 0, opacity: dashed ? 0 : 1 }}
      animate={{ pathLength: 1, opacity: dashed ? 0.4 : 1 }}
      transition={{
        pathLength: { delay, duration: dur, ease: "easeInOut" },
        opacity: { delay, duration: 0.1 },
      }}
    />
  );
}

export default function ThreadIllustration() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      for (let s = 0; s < SCENE_DURATIONS.length; s++) {
        if (cancelled) return;
        await new Promise<void>((r) => setTimeout(r, SCENE_DURATIONS[s]));
        if (cancelled) return;
        setStep((prev) => prev + 1);
      }
      // Fade out then restart
      if (!cancelled) {
        setVisible(false);
        await new Promise<void>((r) => setTimeout(r, 600));
        if (!cancelled) {
          setStep(0);
          setLoopKey((k) => k + 1);
          setVisible(true);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [loopKey]);

  const accentColor = "var(--ochre, #C9933A)";
  const dimColor = "var(--text-muted, rgba(255,255,255,0.25))";

  const scene0Opacity = step >= 0 ? (step >= 2 ? 0.3 : 1) : 0;
  const thread0Opacity = step >= 1 ? (step >= 2 ? 0.15 : 1) : 0;
  const scene1Opacity = step >= 2 ? (step >= 4 ? 0.3 : 1) : 0;
  const thread1Opacity = step >= 3 ? (step >= 4 ? 0.15 : 1) : 0;
  const scene2Opacity = step >= 4 ? 1 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={loopKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full flex justify-center"
        >
          <svg
            viewBox="0 0 240 500"
            width="240"
            height="500"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            {/* Scene 0 - Suitcase */}
            <motion.g animate={{ opacity: scene0Opacity }} transition={{ duration: 0.5 }}>
              {step >= 0 && SCENE0_PATHS.map((p) => (
                <AnimatedPath key={p.d} {...p} stroke={accentColor} loopKey={loopKey} />
              ))}
            </motion.g>

            {/* Thread 0→1 */}
            <motion.g animate={{ opacity: thread0Opacity }} transition={{ duration: 0.4 }}>
              {step >= 1 && (
                <AnimatedPath {...THREAD0} stroke={dimColor} loopKey={loopKey} />
              )}
            </motion.g>

            {/* Scene 1 - Location pin */}
            <motion.g animate={{ opacity: scene1Opacity }} transition={{ duration: 0.5 }}>
              {step >= 2 && SCENE1_PATHS.map((p) => (
                <AnimatedPath key={p.d} {...p} stroke={accentColor} loopKey={loopKey} />
              ))}
            </motion.g>

            {/* Thread 1→2 */}
            <motion.g animate={{ opacity: thread1Opacity }} transition={{ duration: 0.4 }}>
              {step >= 3 && (
                <AnimatedPath {...THREAD1} stroke={dimColor} loopKey={loopKey} />
              )}
            </motion.g>

            {/* Scene 2 - House */}
            <motion.g animate={{ opacity: scene2Opacity }} transition={{ duration: 0.5 }}>
              {step >= 4 && SCENE2_PATHS.map((p) => (
                <AnimatedPath key={p.d} {...p} stroke={accentColor} loopKey={loopKey} />
              ))}
            </motion.g>

            {/* Labels */}
            {LABELS.map(({ y, label }, i) => {
              const isActive =
                (i === 0 && step >= 0 && step < 2) ||
                (i === 1 && step >= 2 && step < 4) ||
                (i === 2 && step >= 4);
              const isDone =
                (i === 0 && step >= 2) ||
                (i === 1 && step >= 4);
              return (
                <motion.text
                  key={label}
                  x="120"
                  y={y}
                  textAnchor="middle"
                  fontFamily="var(--font-mono, monospace)"
                  fontSize="9"
                  letterSpacing="0.38em"
                  animate={{
                    opacity: isActive ? 1 : isDone ? 0.25 : 0,
                    fill: isActive ? accentColor : "#888",
                  }}
                  transition={{ duration: 0.4 }}
                >
                  {label.toUpperCase()}
                </motion.text>
              );
            })}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
