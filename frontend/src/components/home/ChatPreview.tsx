"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface StayCard {
  name: string;
  price: string;
  detail: string;
  stars: number;
}

interface Demo {
  city: string;
  prompt: string;
  intro: string;
  cards: StayCard[];
}

const DEMOS: Demo[] = [
  {
    city: "Bangkok",
    prompt: "Quiet rooftop in Bangkok, near temples, under $80/night",
    intro: "3 matches for you:",
    cards: [
      { name: "The Golden Loft", price: "$65", detail: "Rooftop · Wat Arun views", stars: 4.9 },
      { name: "Temple Gate Suite", price: "$58", detail: "Garden courtyard · Temple views", stars: 4.8 },
      { name: "River Residence", price: "$72", detail: "Floating terrace · Old Town", stars: 4.7 },
    ],
  },
  {
    city: "London",
    prompt: "A studio in Shoreditch, walkable to Borough Market",
    intro: "2 curated picks:",
    cards: [
      { name: "Brick Lane Loft", price: "£95", detail: "Floor-to-ceiling windows · Market 8 min", stars: 4.9 },
      { name: "Shoreditch Light", price: "£120", detail: "Private terrace · Columbia Rd nearby", stars: 4.8 },
    ],
  },
  {
    city: "Cape Town",
    prompt: "Ocean view flat in Cape Town, close to Table Mountain",
    intro: "2 properties match:",
    cards: [
      { name: "Atlantic Suite", price: "R 1,850", detail: "Direct ocean panorama · Mountain 10 min", stars: 5.0 },
      { name: "Clifton Penthouse", price: "R 2,200", detail: "Sunset terrace · Camps Bay nearby", stars: 4.9 },
    ],
  },
];

type Phase = "idle" | "typing" | "sent" | "thinking" | "responding" | "complete";

const CHAR_DELAY = 32;
const THINKING_DURATION = 1400;
const CARD_REVEAL_DELAY = 450;
const COMPLETE_PAUSE = 3200;

export default function ChatPreview() {
  const [demoIndex, setDemoIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedText, setTypedText] = useState("");
  const [visibleCards, setVisibleCards] = useState(0);
  const cancelRef = useRef(false);

  const demo = DEMOS[demoIndex];

  useEffect(() => {
    cancelRef.current = false;

    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        const t = setTimeout(r, ms);
        const check = setInterval(() => { if (cancelRef.current) { clearTimeout(t); clearInterval(check); r(); } }, 50);
      });

    async function run() {
      await sleep(600);
      if (cancelRef.current) return;

      // Typing phase
      setPhase("typing");
      const prompt = DEMOS[demoIndex].prompt;
      for (let i = 1; i <= prompt.length; i++) {
        if (cancelRef.current) return;
        setTypedText(prompt.slice(0, i));
        await sleep(CHAR_DELAY);
      }

      if (cancelRef.current) return;
      setPhase("sent");
      await sleep(400);

      if (cancelRef.current) return;
      setPhase("thinking");
      await sleep(THINKING_DURATION);

      if (cancelRef.current) return;
      setPhase("responding");
      setVisibleCards(0);

      const cardCount = DEMOS[demoIndex].cards.length;
      for (let i = 1; i <= cardCount; i++) {
        if (cancelRef.current) return;
        await sleep(CARD_REVEAL_DELAY);
        setVisibleCards(i);
      }

      if (cancelRef.current) return;
      setPhase("complete");
      await sleep(COMPLETE_PAUSE);

      if (cancelRef.current) return;
      setPhase("idle");
      setTypedText("");
      setVisibleCards(0);
      setDemoIndex((prev) => (prev + 1) % DEMOS.length);
    }

    run();

    return () => { cancelRef.current = true; };
  }, [demoIndex]);

  const showUserMessage = phase !== "idle";
  const showThinking = phase === "thinking";
  const showCards = phase === "responding" || phase === "complete";

  return (
    <div className="relative rounded-sm border border-[var(--ink)] bg-[var(--ivory)] overflow-hidden shadow-[8px_12px_0_0_var(--ink)]">
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4 border-b border-[var(--ink)]">
        <div className="flex gap-1.5">
          {["var(--terra)", "var(--ochre)", "var(--tide)"].map((c, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] font-mono tracking-[0.32em] text-[var(--ink-muted)] flex-1 text-center uppercase">
          StayBot · Concierge
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--terra)] animate-pulse" />
          <span className="text-[9px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="p-4 md:p-5 space-y-3.5 md:space-y-4 min-h-[320px] md:min-h-[420px] flex flex-col justify-end">
        <AnimatePresence mode="popLayout">
          {/* User message */}
          {showUserMessage && (
            <motion.div
              key={`user-${demoIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex justify-end"
            >
              <div className="max-w-[82%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[var(--ink)] text-[var(--paper)] text-[13px] leading-relaxed">
                {typedText}
                {phase === "typing" && (
                  <span className="inline-block w-0.5 h-3.5 bg-[var(--paper)] ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            </motion.div>
          )}

          {/* Thinking indicator */}
          {showThinking && (
            <motion.div
              key={`thinking-${demoIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold font-mono">S</span>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--paper-soft,#f5f3ef)] border border-[var(--border)] flex gap-1.5 items-center">
                {[0, 0.2, 0.4].map((d) => (
                  <motion.div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* AI response with cards */}
          {showCards && (
            <motion.div
              key={`response-${demoIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-start gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold font-mono">S</span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-[var(--paper-soft,#f5f3ef)] border border-[var(--border)] text-[13px] text-[var(--ink)] leading-relaxed">
                  {demo.intro}
                </div>
                <div className="space-y-2">
                  {demo.cards.slice(0, visibleCards).map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35 }}
                      className="rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--ink)] truncate">{card.name}</p>
                        <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 truncate">{card.detail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[14px] font-semibold text-[var(--ink)]">{card.price}</span>
                        <span className="text-[10px] font-mono text-[var(--ochre)]">★ {card.stars}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="px-4 md:px-5 py-3.5 md:py-4 border-t border-[var(--ink)] flex items-center gap-2.5 md:gap-3">
        <div className="flex-1 bg-[var(--paper)] rounded-full px-3.5 md:px-4 py-2.5 text-[11px] md:text-xs text-[var(--ink-muted)] border border-[var(--border)]">
          Describe your perfect stay…
        </div>
        <button className="w-9 h-9 rounded-full bg-[var(--ink)] flex items-center justify-center text-[var(--paper)] hover:bg-[var(--ink-soft)] transition-colors text-sm shrink-0">
          →
        </button>
      </div>
    </div>
  );
}
