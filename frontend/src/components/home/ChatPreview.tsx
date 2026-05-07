"use client";

import { motion } from "framer-motion";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MESSAGES = [
  { role: "user" as const, text: "I want a quiet place in Bangkok with rooftop views, near temples, under $80." },
  { role: "ai" as const, text: "Three matches. Top pick: The Golden Loft — $65/night, rooftop facing Wat Arun, 5-min walk to the river." },
  { role: "user" as const, text: "Yes — and Dec 15–20." },
  { role: "ai" as const, text: "Available. Five nights at $325 total. Free cancellation until Dec 10. Should I hold the dates?" },
];

export default function ChatPreview() {
  return (
    <div className="relative rounded-sm border border-[var(--ink)] bg-[var(--ivory)] overflow-hidden shadow-[8px_12px_0_0_var(--ink)]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex gap-1.5">
          {(["var(--terra)", "var(--ochre)", "var(--tide)"] as const).map((c, i) => (
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

      <div className="p-5 space-y-4 min-h-[380px]">
        {MESSAGES.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.5, ease: easeOutExpo }}
            viewport={{ once: true }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold font-mono">S</span>
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--ink)] text-[var(--paper)] rounded-tr-sm"
                  : "bg-[var(--paper-soft)] text-[var(--ink)] rounded-tl-sm border border-[var(--border)]"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-[var(--ink)] flex items-center gap-3">
        <div className="flex-1 bg-[var(--paper)] rounded-full px-4 py-2.5 text-xs text-[var(--ink-muted)] border border-[var(--border)]">
          Describe your perfect stay…
        </div>
        <button className="w-9 h-9 rounded-full bg-[var(--ink)] flex items-center justify-center text-[var(--paper)] hover:bg-[var(--ink-soft)] transition-colors text-sm">
          →
        </button>
      </div>
    </div>
  );
}
