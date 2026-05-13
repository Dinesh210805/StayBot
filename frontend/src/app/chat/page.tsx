"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import Link from "next/link";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const STARTERS = [
  { city: "Bangkok", text: "A cozy loft in Bangkok under $80, near temples", color: "var(--terra)" },
  { city: "Cape Town", text: "Ocean-view villa in Cape Town for 4 guests", color: "var(--tide)" },
  { city: "London", text: "Quiet studio in Marylebone near the tube", color: "var(--forest)" },
  { city: "Top picks", text: "Most-loved stays with a pool", color: "var(--ochre)" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm your StayBot concierge. I curate stays in **Bangkok**, **London**, and **Cape Town**.\n\nTell me what you're looking for — vibe, dates, budget, neighborhood — and I'll surface the right matches.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<Listing[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh sample suggestions on send
  const refreshSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.listings.list({ per_page: 6 });
      setSuggestions(res.listings ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
      const loadingMsg: Message = { id: "loading", role: "assistant", content: "", loading: true };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setSending(true);

      try {
        let activeSessionId = sessionId;
        if (!activeSessionId) {
          const sessionRes = await api.sessions.create();
          activeSessionId = sessionRes.session_id;
          setSessionId(activeSessionId);
        }

        const res = await api.chat.send(text.trim(), activeSessionId);
        setSessionId(res.session_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading"
              ? { id: crypto.randomUUID(), role: "assistant", content: res.response }
              : m
          )
        );
        refreshSuggestions();
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading"
              ? {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: "Hmm — I couldn't reach the server. Make sure the backend is running and try again.",
                }
              : m
          )
        );
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sessionId, sending, refreshSuggestions]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="pt-24 pb-8 max-w-[1500px] mx-auto px-6 md:px-10 h-screen flex flex-col">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 flex-1 min-h-0">
          {/* ── LEFT: Chat ───────────────────────────────────────── */}
          <section className="lg:col-span-7 border border-[var(--ink)] bg-[var(--ivory)] rounded-sm flex flex-col min-h-0 shadow-[6px_6px_0_0_var(--ink)] overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--ink)] px-6 py-4 flex items-center justify-between bg-[var(--paper)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center">
                  <span className="font-mono text-xs font-bold">S</span>
                </div>
                <div>
                  <p className="font-display text-lg leading-tight">
                    The <em className="italic-display text-[var(--terra)]">Concierge</em>
                  </p>
                  <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
                    Bangkok · London · Cape Town
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] tracking-[0.32em] uppercase text-[var(--ink-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)] animate-pulse" />
                  Live
                </span>
                {sessionId && (
                  <button
                    onClick={async () => {
                      try { await api.sessions.delete(sessionId); } catch {}
                      setSessionId(undefined);
                      setMessages([{
                        id: "welcome",
                        role: "assistant",
                        content: "Fresh start. Tell me about your ideal stay.",
                      }]);
                    }}
                    className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--ink)] rounded-full px-3 py-1.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  >
                    New
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Starters */}
            <AnimatePresence>
              {messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-6 py-4 border-t border-[var(--border)]"
                >
                  <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--ink-muted)] mb-3">
                    Try one of these
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="group text-left p-3 rounded-sm border border-[var(--border-strong)] hover:border-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
                      >
                        <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1.5" style={{ color: s.color }}>
                          {s.city}
                        </p>
                        <p className="text-sm text-[var(--ink)] leading-snug">{s.text}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="border-t border-[var(--ink)] p-4">
              <div className="flex items-end gap-3 bg-[var(--paper)] rounded-full border border-[var(--ink)] px-5 py-2 focus-within:shadow-[2px_3px_0_0_var(--ink)] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your perfect stay…"
                  rows={1}
                  disabled={sending}
                  className="flex-1 bg-transparent text-[var(--ink)] text-sm resize-none outline-none placeholder:text-[var(--ink-muted)] leading-relaxed max-h-32 overflow-y-auto py-2"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--terra)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </motion.button>
              </div>
              <p className="text-center text-[9px] tracking-[0.3em] uppercase font-mono text-[var(--ink-muted)] mt-2.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </section>

          {/* ── RIGHT: Live results panel ────────────────────────── */}
          <aside className="lg:col-span-5 border border-[var(--ink)] bg-[var(--paper)] rounded-sm flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-[var(--ink)] px-5 py-4 flex items-center justify-between bg-[var(--ink)] text-[var(--paper)]">
              <div>
                <p className="font-mono text-[9px] tracking-[0.32em] uppercase opacity-60 mb-0.5">Live · Curated for you</p>
                <p className="font-display text-lg italic-display">As we talk…</p>
              </div>
              <Link
                href="/explore"
                className="text-[10px] font-mono uppercase tracking-widest border border-[var(--paper)]/40 rounded-full px-3 py-1.5 hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-colors"
              >
                See all
              </Link>
            </div>

            {/* Mini map illustration */}
            <div className="border-b border-[var(--ink)] bg-[var(--paper-soft)] h-32 relative overflow-hidden">
              <MiniMap />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
                <span>Sample atlas</span>
                <span>3 cities</span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingSuggestions ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2">
                    <div className="w-20 h-20 shimmer rounded-sm" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-3/4 shimmer rounded-sm" />
                      <div className="h-2.5 w-1/2 shimmer rounded-sm" />
                      <div className="h-2.5 w-2/5 shimmer rounded-sm" />
                    </div>
                  </div>
                ))
              ) : suggestions.length === 0 ? (
                <div className="text-center py-12 text-[var(--ink-muted)] text-sm">
                  <p className="font-display text-2xl italic mb-2">No matches yet</p>
                  <p className="text-xs">Tell me what you're looking for →</p>
                </div>
              ) : (
                suggestions.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                  >
                    <Link
                      href={`/explore/${s.id}`}
                      className="group flex gap-3 p-2 rounded-sm hover:bg-[var(--paper-soft)] transition-colors"
                    >
                      <div className="relative w-20 h-20 rounded-sm overflow-hidden flex-shrink-0 bg-[var(--paper-soft)] border border-[var(--border)]">
                        <Image
                          src={s.picture_url ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                          alt={s.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="80px"
                        />
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
                          {s.city} · {s.property_type}
                        </p>
                        <p className="font-display text-base text-[var(--ink)] truncate mt-0.5">
                          {s.name}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-[var(--terra)]">★ {s.rating.toFixed(1)}</span>
                          <span className="font-mono text-xs text-[var(--ink)]">
                            {formatPrice(s.price_per_night)} <span className="text-[var(--ink-muted)] text-[10px]">/n</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--ink)] p-4 bg-[var(--paper)]">
              <Link
                href="/booking"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-colors group"
              >
                Open the calendar
                <span className="w-7 h-7 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center text-xs group-hover:rotate-[-45deg] transition-transform duration-300">
                  →
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1 font-mono ${
          isUser
            ? "bg-[var(--terra)] text-[var(--paper)]"
            : "bg-[var(--ink)] text-[var(--paper)]"
        }`}
      >
        {isUser ? "U" : "S"}
      </div>
      <div
        className={`max-w-[78%] px-5 py-3.5 text-[14px] leading-relaxed ${
          isUser
            ? "bg-[var(--ink)] text-[var(--paper)] rounded-[18px] rounded-tr-sm"
            : "bg-[var(--paper-soft)] text-[var(--ink)] rounded-[18px] rounded-tl-sm border border-[var(--border)]"
        }`}
      >
        {msg.loading ? (
          <div className="flex gap-1.5 items-center h-5">
            {[0, 0.2, 0.4].map((d) => (
              <motion.div
                key={d}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                className="w-2 h-2 rounded-full bg-[var(--ink)]"
              />
            ))}
          </div>
        ) : (
          <MessageContentRenderer content={msg.content} isUser={isUser} />
        )}
      </div>
    </motion.div>
  );
}

function ListingCard({ s }: { s: Listing }) {
  return (
    <Link
      href={`/explore/${s.id}`}
      className="group flex gap-3 p-2 rounded-sm hover:bg-[var(--paper-soft)] transition-colors"
    >
      <div className="relative w-20 h-20 rounded-sm overflow-hidden flex-shrink-0 bg-[var(--paper-soft)] border border-[var(--border)]">
        <Image
          src={s.picture_url ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
          alt={s.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="80px"
        />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
          {s.city} · {s.property_type}
        </p>
        <p className="font-display text-base text-[var(--ink)] truncate mt-0.5">{s.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-[var(--terra)]">★ {s.rating?.toFixed(1) ?? "—"}</span>
          <span className="font-mono text-xs text-[var(--ink)]">
            {formatPrice(s.price_per_night)} <span className="text-[var(--ink-muted)] text-[10px]">/n</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function MessageContentRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  // If assistant embeds a JSON payload like { listings: [...] }, render cards inline.
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.listings) && parsed.listings.length > 0) {
      const listings: Listing[] = parsed.listings;
      return (
        <div className="space-y-2">
          {listings.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
              <ListingCard s={s} />
            </motion.div>
          ))}
        </div>
      );
    }
  } catch (e) {
    // not JSON — fall through to markdown
  }

  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className={isUser ? "text-[var(--ochre-bright)]" : "text-[var(--terra)]"}>{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} className="underline underline-offset-2 hover:opacity-70" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mt-2 space-y-1 list-none">{children}</ul>,
        li: ({ children }) => (
          <li className="flex gap-2 before:content-['—'] before:opacity-50 before:flex-shrink-0">
            <span>{children}</span>
          </li>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ── Mini map for sidebar ───────────────────────────────────────────────
function MiniMap() {
  return (
    <svg viewBox="0 0 400 130" className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="mini-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0E1110" strokeWidth="0.5" opacity="0.05" />
        </pattern>
      </defs>
      <rect width="400" height="130" fill="url(#mini-grid)" />

      {/* Pseudo-coastline */}
      <path d="M 0 90 Q 50 70 100 80 T 200 75 T 300 85 T 400 70" fill="none" stroke="#0E1110" strokeWidth="0.7" opacity="0.3" />
      <path d="M 0 100 Q 50 95 100 100 T 400 95" fill="none" stroke="#0E1110" strokeWidth="0.4" opacity="0.2" />

      {/* City pins — Bangkok / London / Cape Town */}
      {[
        { x: 90, y: 50, color: "#1F3A2C", label: "LDN" },   // London top-left
        { x: 220, y: 40, color: "#C25A38", label: "BKK" },  // Bangkok mid
        { x: 320, y: 90, color: "#4A8385", label: "CPT" },  // Cape Town bottom-right
      ].map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="14" fill={p.color} opacity="0.15" />
          <circle cx={p.x} cy={p.y} r="7" fill={p.color} opacity="0.30" />
          <circle cx={p.x} cy={p.y} r="4" fill={p.color} stroke="#F2EBDB" strokeWidth="1.5" />
          <text x={p.x} y={p.y - 14} textAnchor="middle" fontFamily="monospace" fontSize="9" fill="#0E1110" letterSpacing="1.5">{p.label}</text>
        </g>
      ))}

      {/* Connecting lines */}
      <g stroke="#0E1110" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.4">
        <line x1="90" y1="50" x2="220" y2="40" />
        <line x1="220" y1="40" x2="320" y2="90" />
      </g>
    </svg>
  );
}
