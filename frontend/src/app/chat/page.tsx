"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import MetricsPill from "@/components/chat/MetricsPill";

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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div className="flex-1 min-h-0 pt-20 pb-4 px-4 md:px-8 lg:px-10 max-w-4xl mx-auto w-full flex flex-col">

        {/* ── Full-width chat ───────────────────────────────────────── */}
        <section className="flex-1 min-h-0 border border-[var(--ink)] bg-[var(--ivory)] rounded-sm flex flex-col shadow-[4px_4px_0_0_var(--ink)] overflow-hidden">
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
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 min-h-0">
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
      </div>

      {/* Floating dev metrics pill */}
      <MetricsPill />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
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
      <div className={`${isUser ? "max-w-[80%]" : "flex-1 min-w-0"}`}>
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
          /* Assistant with listings: text then inline cards */
          <div className="bg-[var(--paper-soft)] text-[var(--ink)] rounded-[16px] rounded-tl-sm border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3.5 text-[14px] leading-relaxed border-b border-[var(--border)]">
              <MessageText content={msg.content} />
            </div>
            <div className="px-3 py-3">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)] mb-2.5 px-1">
                Stays mentioned
              </p>
              <InlineListingCards ids={msg.listingIds} />
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

// Skeleton card shown while listings are loading
function SkeletonCard() {
  return (
    <div className="flex gap-3 p-2.5 rounded-sm border border-[var(--border)] overflow-hidden">
      <div className="w-[72px] h-[72px] rounded-sm bg-[var(--ink)]/8 animate-pulse shrink-0" />
      <div className="flex flex-col gap-2 flex-1 justify-center">
        <div className="h-2.5 w-16 rounded bg-[var(--ink)]/8 animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-[var(--ink)]/8 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-[var(--ink)]/8 animate-pulse" />
      </div>
    </div>
  );
}

// Fetches listing cards and renders them inline with accordion map expansion
function InlineListingCards({ ids }: { ids: string[] }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {listings.map((s, i) => {
        const isExpanded = expandedId === s.id;
        const hasCords = s.latitude != null && s.longitude != null;

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            {/* Card */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
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

              {/* Expand indicator */}
              <div className="flex items-center pr-0.5">
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[var(--ink-muted)] group-hover:text-[var(--terra)] text-sm transition-colors"
                >
                  →
                </motion.span>
              </div>
            </button>

            {/* Accordion — inline map + nearby places */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-x border-b border-[var(--ink)] rounded-b-sm shadow-[2px_2px_0_0_var(--ink)]"
                >
                  {hasCords ? (
                    <ConciergeMap listing={s as MappedListing} compact />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center bg-[var(--paper-soft)]">
                      <p className="text-[13px] text-[var(--ink-muted)]">Location data not available for this listing.</p>
                      <Link
                        href={`/explore/${s.id}`}
                        className="text-[10px] font-mono uppercase tracking-widest border border-[var(--ink)] rounded-full px-4 py-2 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                      >
                        View full details →
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
