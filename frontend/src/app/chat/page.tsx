"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const ConciergeMap = dynamic(() => import("@/components/map/ConciergeMap"), { ssr: false });

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
  listingIds?: string[];
}

type MappedListing = Listing & { latitude: number; longitude: number };

function extractListingIds(text: string): string[] {
  const matches = [...text.matchAll(/ID:\s*([\d.]+)/g)];
  return [...new Set(matches.map((m) => m[1].replace(/\.0$/, "")))];
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
  const [selectedListing, setSelectedListing] = useState<MappedListing | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectListing = useCallback(async (id: string) => {
    setLoadingListing(true);
    try {
      const listing = await api.listings.get(id);
      if (listing.latitude != null && listing.longitude != null) {
        setSelectedListing(listing as MappedListing);
      } else {
        setSelectedListing(null);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingListing(false);
    }
  }, []);

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
        const ids = extractListingIds(res.response);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading"
              ? {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: res.response,
                  listingIds: ids.length > 0 ? ids : undefined,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading"
              ? {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content:
                    "Hmm — I couldn't reach the server. Make sure the backend is running and try again.",
                }
              : m
          )
        );
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sessionId, sending]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--paper)] flex flex-col">
      <div className="flex-1 min-h-0 pt-20 pb-4 px-4 md:px-8 lg:px-10 max-w-[1500px] mx-auto w-full flex flex-col">
        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">

          {/* ── LEFT: Chat ───────────────────────────────────────── */}
          <section className="lg:col-span-7 border border-[var(--ink)] bg-[var(--ivory)] rounded-sm flex flex-col min-h-0 shadow-[4px_4px_0_0_var(--ink)] overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--ink)] px-5 py-3.5 flex items-center justify-between bg-[var(--paper)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center">
                  <span className="font-mono text-xs font-bold">S</span>
                </div>
                <div>
                  <p className="font-display text-base leading-tight">
                    The <em className="italic-display text-[var(--terra)]">Concierge</em>
                  </p>
                  <p className="font-mono text-[8px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
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
                      setSelectedListing(null);
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

            {/* Messages — this is the scrollable area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onSelectListing={selectListing} />
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
                  className="px-5 py-3.5 border-t border-[var(--border)] flex-shrink-0"
                >
                  <p className="font-mono text-[9px] tracking-[0.32em] uppercase text-[var(--ink-muted)] mb-2.5">
                    Try one of these
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="group text-left p-3 rounded-sm border border-[var(--border-strong)] hover:border-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
                      >
                        <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: s.color }}>
                          {s.city}
                        </p>
                        <p className="text-[13px] text-[var(--ink)] leading-snug">{s.text}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="border-t border-[var(--ink)] p-3.5 flex-shrink-0">
              <div className="flex items-end gap-3 bg-[var(--paper)] rounded-full border border-[var(--ink)] px-4 py-2 focus-within:shadow-[2px_2px_0_0_var(--ink)] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your perfect stay…"
                  rows={1}
                  disabled={sending}
                  className="flex-1 bg-transparent text-[var(--ink)] text-sm resize-none outline-none placeholder:text-[var(--ink-muted)] leading-relaxed max-h-28 overflow-y-auto py-1.5"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--terra)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </motion.button>
              </div>
              <p className="text-center text-[9px] tracking-[0.3em] uppercase font-mono text-[var(--ink-muted)] mt-2">
                Enter · Shift+Enter for new line
              </p>
            </div>
          </section>

          {/* ── RIGHT: Map panel (desktop only) ──────────────────── */}
          <aside className="hidden lg:flex lg:col-span-5 border border-[var(--ink)] bg-[var(--paper)] rounded-sm flex-col min-h-0 overflow-hidden shadow-[4px_4px_0_0_var(--ink)]">
            <AnimatePresence mode="wait">
              {loadingListing ? (
                <MapLoading key="map-loading" />
              ) : selectedListing ? (
                <motion.div
                  key={`map-${selectedListing.id}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <ConciergeMap listing={selectedListing} />
                </motion.div>
              ) : (
                <MapPlaceholder key="map-placeholder" />
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>

      {/* ── Mobile bottom sheet (< lg) ────────────────────────────── */}
      <AnimatePresence>
        {(selectedListing || loadingListing) && (
          <motion.div
            key="mobile-sheet-backdrop"
            className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setSelectedListing(null)}
            />
            {/* Sheet */}
            <motion.div
              className="relative bg-[var(--paper)] rounded-t-2xl flex flex-col overflow-hidden"
              style={{ height: "82vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              {/* Handle bar */}
              <div className="flex-shrink-0 pt-3 pb-2.5 flex items-center justify-between px-5 border-b border-[var(--border)]">
                <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto" />
                <button
                  onClick={() => setSelectedListing(null)}
                  className="absolute right-4 font-mono text-[10px] tracking-widest uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingListing ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--ink-muted)]">
                    <div className="flex gap-2">
                      {[0, 0.15, 0.3].map((d) => (
                        <motion.div
                          key={d}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                          className="w-2 h-2 rounded-full bg-[var(--ink)]"
                        />
                      ))}
                    </div>
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase">Loading stay…</p>
                  </div>
                ) : selectedListing ? (
                  <ConciergeMap listing={selectedListing} />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function MapLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--ink-muted)]"
    >
      <div className="flex gap-2">
        {[0, 0.15, 0.3].map((d) => (
          <motion.div
            key={d}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: d }}
            className="w-2 h-2 rounded-full bg-[var(--ink)]"
          />
        ))}
      </div>
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase">Loading stay…</p>
    </motion.div>
  );
}

function MapPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center"
    >
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 96 96" className="w-full h-full opacity-20">
          <circle cx="48" cy="48" r="38" stroke="var(--ink)" strokeWidth="1.5" fill="none" />
          <ellipse cx="48" cy="48" rx="18" ry="38" stroke="var(--ink)" strokeWidth="1" fill="none" />
          <line x1="10" y1="48" x2="86" y2="48" stroke="var(--ink)" strokeWidth="1" />
          <line x1="18" y1="28" x2="78" y2="28" stroke="var(--ink)" strokeWidth="0.7" />
          <line x1="18" y1="68" x2="78" y2="68" stroke="var(--ink)" strokeWidth="0.7" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🏡</span>
        </div>
      </div>
      <div>
        <p className="font-display text-xl italic-display text-[var(--ink)] mb-2">Pick a stay</p>
        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          Ask me anything and tap a listing card in the chat to explore it on the map with nearby spots.
        </p>
      </div>
      <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
        <span className="w-5 h-px bg-[var(--ink-muted)]" />
        Bangkok · London · Cape Town
        <span className="w-5 h-px bg-[var(--ink-muted)]" />
      </div>
      <Link
        href="/explore"
        className="text-[10px] font-mono uppercase tracking-widest border border-[var(--ink)] rounded-full px-4 py-2 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
      >
        Browse all stays
      </Link>
    </motion.div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────
function MessageBubble({
  msg,
  onSelectListing,
}: {
  msg: Message;
  onSelectListing: (id: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-1 font-mono ${
          isUser ? "bg-[var(--terra)] text-[var(--paper)]" : "bg-[var(--ink)] text-[var(--paper)]"
        }`}
      >
        {isUser ? "U" : "S"}
      </div>

      {/* Bubble */}
      <div className={`${isUser ? "max-w-[86%]" : msg.listingIds && msg.listingIds.length > 0 ? "max-w-[96%] w-full" : "max-w-[86%]"} ${isUser ? "items-end" : "items-start"}`}>
        {msg.loading ? (
          <div className="px-4 py-3.5 bg-[var(--paper-soft)] rounded-[16px] rounded-tl-sm border border-[var(--border)]">
            <div className="flex gap-1.5 items-center h-5">
              {[0, 0.2, 0.4].map((d) => (
                <motion.div
                  key={d}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]"
                />
              ))}
            </div>
          </div>
        ) : isUser ? (
          <div className="px-4 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-[16px] rounded-tr-sm text-[14px] leading-relaxed">
            {msg.content}
          </div>
        ) : msg.listingIds && msg.listingIds.length > 0 ? (
          /* Assistant: side-by-side — text left, cards right */
          <div className="bg-[var(--paper-soft)] text-[var(--ink)] rounded-[16px] rounded-tl-sm border border-[var(--border)] overflow-hidden flex flex-col sm:flex-row">
            {/* Text column */}
            <div className="px-4 py-3.5 text-[14px] leading-relaxed flex-1 min-w-0 sm:border-r border-b sm:border-b-0 border-[var(--border)]">
              <MessageText content={msg.content} />
            </div>
            {/* Cards column */}
            <div className="sm:w-64 flex-shrink-0 px-2.5 py-3 bg-[var(--paper)] flex flex-col">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)] mb-2 px-1">
                Stays mentioned
              </p>
              <InlineListingCards ids={msg.listingIds} onSelect={onSelectListing} />
            </div>
          </div>
        ) : (
          /* Assistant: text only */
          <div className="bg-[var(--paper-soft)] text-[var(--ink)] rounded-[16px] rounded-tl-sm border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3.5 text-[14px] leading-relaxed">
              <MessageText content={msg.content} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--terra)]">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="underline underline-offset-2 hover:opacity-70"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mt-2 space-y-1.5 list-none">{children}</ul>,
        li: ({ children }) => (
          <li className="flex gap-2 before:content-['—'] before:opacity-40 before:flex-shrink-0 before:mt-px">
            <span>{children}</span>
          </li>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h3: ({ children }) => (
          <h3 className="font-semibold text-[var(--ink)] mt-3 mb-1 first:mt-0">{children}</h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// Fetches listing cards and renders them inline inside the bot message
function InlineListingCards({
  ids,
  onSelect,
}: {
  ids: string[];
  onSelect: (id: string) => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(ids.map((id) => api.listings.get(id).catch(() => null))).then((results) => {
      if (cancelled) return;
      setListings(results.filter((l): l is Listing => l !== null));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ids]);

  if (loading) {
    return (
      <div className="flex gap-1.5 py-3 px-1 justify-center">
        {[0, 0.1, 0.2].map((d) => (
          <motion.div
            key={d}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: d }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]"
          />
        ))}
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <div className="space-y-2">
      {listings.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <button
            onClick={() => onSelect(s.id)}
            className="w-full group flex gap-3 p-2.5 rounded-sm border border-[var(--border)] bg-[var(--paper-soft)] hover:border-[var(--ink)] hover:bg-[var(--paper)] hover:shadow-[2px_2px_0_0_var(--ink)] transition-all text-left"
          >
            {/* Thumbnail */}
            <div className="relative w-[72px] h-[72px] rounded-sm overflow-hidden flex-shrink-0 bg-[var(--paper-soft)] border border-[var(--border)]">
              <Image
                src={
                  s.picture_url ??
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"
                }
                alt={s.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="72px"
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 py-0.5">
              <p className="font-mono text-[8px] tracking-[0.3em] uppercase text-[var(--ink-muted)]">
                {s.city} · {s.property_type}
              </p>
              <p className="font-display text-[15px] text-[var(--ink)] truncate mt-0.5 leading-tight">
                {s.name}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[12px] text-[var(--terra)]">★ {s.rating?.toFixed(1) ?? "—"}</span>
                <span className="font-mono text-[12px] text-[var(--ink)]">
                  {formatPrice(s.price_per_night)}
                  <span className="text-[var(--ink-muted)] text-[10px]">/n</span>
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center pr-0.5">
              <span className="text-[var(--ink-muted)] group-hover:text-[var(--terra)] text-sm transition-colors">→</span>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
