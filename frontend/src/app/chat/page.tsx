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

const PANEL_W = "50vw";
const PANEL_W_PX = "50%";

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

function cleanAssistantText(text: string): string {
  return text
    .replace(/\s*\(ID:\s*[\d.]+\)/g, "")
    .replace(/\s*ID:\s*[\d.]+/g, "")
    .trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm your StayBot concierge. I curate stays in **Bangkok**, **London**, **Cape Town**, and **Istanbul**.\n\nTell me what you're looking for — vibe, dates, budget, neighborhood — and I'll surface the right matches.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openListing = useCallback((listing: Listing) => {
    setSelectedListing(listing);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelectedListing(null), 520);
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
                    "I couldn't reach the server. Make sure the backend is running and try again.",
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

  const resetSession = useCallback(async () => {
    if (sessionId) {
      try { await api.sessions.delete(sessionId); } catch {}
    }
    setSessionId(undefined);
    closePanel();
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Fresh start. Tell me about your ideal stay.",
    }]);
  }, [sessionId, closePanel]);

  const hasCords = (l: Listing): l is MappedListing =>
    l.latitude != null && l.longitude != null;

  return (
    /*
     * fixed inset-0 z-40: takes over the full viewport, covers the global
     * Navigation and bypasses Lenis which only affects document scroll.
     */
    <div className="fixed inset-0 z-40 bg-[var(--paper)] flex overflow-hidden">

      {/* ── Left pane: chat ──────────────────────────────────────────── */}
      <div
        className="flex flex-col min-w-0 flex-shrink-0"
        style={{
          width: panelOpen ? `calc(100% - ${PANEL_W})` : "100%",
          transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <header className="flex-shrink-0 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center hover:bg-[var(--terra)] transition-colors flex-shrink-0">
              <span className="font-mono text-[10px] font-bold leading-none">S</span>
            </Link>
            <div className="min-w-0">
              <p className="font-display text-[15px] leading-tight truncate">
                The <em className="italic-display text-[var(--terra)]">Concierge</em>
              </p>
              <p className="font-mono text-[8px] tracking-[0.28em] uppercase text-[var(--ink-muted)] hidden sm:block truncate">
                Bangkok · London · Cape Town · Istanbul
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--ink-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)] animate-pulse" />
              Live
            </span>
            {sessionId && (
              <button
                onClick={resetSession}
                className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--paper)] border border-[var(--ink)] rounded-full px-3 py-1.5 hover:bg-[var(--ink)] transition-colors whitespace-nowrap"
              >
                New chat
              </button>
            )}
          </div>
        </header>

        {/* Scrollable message area — data-lenis-prevent stops Lenis intercepting */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          data-lenis-prevent
          style={{ overscrollBehavior: "contain" }}
        >
          <div className="max-w-[640px] mx-auto px-4 py-8">

            {/* Starters */}
            <AnimatePresence>
              {messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="mb-10"
                >
                  <p className="font-mono text-[9px] tracking-[0.32em] uppercase text-[var(--ink-muted)] mb-3 text-center">
                    Try one of these
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="group text-left p-3.5 rounded-xl border border-[var(--border-strong)] hover:border-[var(--ink)] hover:bg-[var(--ivory)] transition-all"
                      >
                        <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-1.5" style={{ color: s.color }}>
                          {s.city}
                        </p>
                        <p className="text-[13px] text-[var(--ink)] leading-snug">{s.text}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onSelectListing={openListing} />
                ))}
              </AnimatePresence>
            </div>

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--paper)]/95 backdrop-blur-md">
          <div className="max-w-[640px] mx-auto px-4 py-3">
            <div className="flex items-end gap-3 bg-[var(--ivory)] rounded-2xl border border-[var(--ink)]/20 px-4 py-3 focus-within:border-[var(--ink)] focus-within:shadow-[0_0_0_1px_var(--ink)] transition-all">
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
                className="flex-1 bg-transparent text-[var(--ink)] text-[14px] resize-none outline-none placeholder:text-[var(--ink-muted)] leading-relaxed max-h-28 overflow-y-auto py-0.5"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--terra)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-sm"
              >
                ↑
              </motion.button>
            </div>
            <p className="text-center text-[9px] tracking-[0.28em] uppercase font-mono text-[var(--ink-muted)] mt-2">
              Enter · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Right pane: detail panel (desktop ≥ md) ──────────────────── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 border-l border-[var(--border-strong)] bg-[var(--paper-soft)] overflow-hidden"
        style={{
          width: PANEL_W_PX,
          transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          /* absolute so it doesn't push the left pane when closed */
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Panel header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-strong)] bg-[var(--paper)]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--terra)] flex-shrink-0" />
            <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-[var(--ink-muted)] truncate">
              {selectedListing?.name ?? "Property Detail"}
            </span>
          </div>
          <button
            onClick={closePanel}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors text-lg flex-shrink-0 ml-2"
            aria-label="Close detail panel"
          >
            ×
          </button>
        </div>

        {/* Panel scroll content */}
        <div
          className="flex-1 overflow-y-auto"
          data-lenis-prevent
          style={{ overscrollBehavior: "contain" }}
        >
          {selectedListing && hasCords(selectedListing) ? (
            <ConciergeMap
              key={selectedListing.id}
              listing={selectedListing as MappedListing}
              compact={false}
            />
          ) : selectedListing ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full py-16 px-6 text-center">
              <p className="font-display text-lg text-[var(--ink)]">{selectedListing.name}</p>
              <p className="text-[13px] text-[var(--ink-muted)]">
                Location data is unavailable for this listing.
              </p>
              <Link
                href={`/explore/${selectedListing.id}`}
                className="text-[10px] font-mono uppercase tracking-widest border border-[var(--ink)] rounded-full px-5 py-2.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                View full details →
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Mobile: full-screen bottom sheet ─────────────────────────── */}
      <AnimatePresence>
        {panelOpen && selectedListing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="md:hidden fixed inset-0 z-50 bg-[var(--ink)]/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-[var(--paper-soft)] rounded-t-2xl flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              {/* Sheet handle */}
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--ink-faint)]" />
              </div>
              <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
                <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-[var(--ink-muted)] truncate">
                  {selectedListing.name}
                </span>
                <button onClick={closePanel} className="text-[var(--ink-muted)] text-lg ml-2">×</button>
              </div>
              <div
                className="flex-1 overflow-y-auto"
                data-lenis-prevent
                style={{ overscrollBehavior: "contain" }}
              >
                {hasCords(selectedListing) ? (
                  <ConciergeMap
                    key={`m-${selectedListing.id}`}
                    listing={selectedListing as MappedListing}
                    compact={false}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                    <p className="text-[13px] text-[var(--ink-muted)]">
                      Location data is unavailable for this listing.
                    </p>
                    <Link
                      href={`/explore/${selectedListing.id}`}
                      className="text-[10px] font-mono uppercase tracking-widest border border-[var(--ink)] rounded-full px-5 py-2.5"
                    >
                      View full details →
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MetricsPill />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onSelectListing,
}: {
  msg: Message;
  onSelectListing: (l: Listing) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-start`}
    >
      {/* Avatar */}
      <div
        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-1 font-mono leading-none ${
          isUser ? "bg-[var(--terra)] text-[var(--paper)]" : "bg-[var(--ink)] text-[var(--paper)]"
        }`}
      >
        {isUser ? "U" : "S"}
      </div>

      <div className={`${isUser ? "max-w-[78%]" : "flex-1 min-w-0"}`}>
        {msg.loading ? (
          <div className="flex gap-1.5 items-center h-8 px-1">
            {[0, 0.18, 0.36].map((d) => (
              <motion.div
                key={d}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: d }}
                className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]"
              />
            ))}
          </div>
        ) : isUser ? (
          <div className="px-4 py-2.5 bg-[var(--ink)] text-[var(--paper)] rounded-2xl rounded-tr-sm text-[14px] leading-relaxed">
            {msg.content}
          </div>
        ) : (
          /* Assistant: clean text then cards in one unified block */
          <div className="space-y-4">
            <div className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
              <MessageText content={cleanAssistantText(msg.content)} />
            </div>
            {msg.listingIds && msg.listingIds.length > 0 && (
              <InlineListingCards ids={msg.listingIds} onSelect={onSelectListing} />
            )}
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
          <strong className="font-semibold text-[var(--ink)]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--terra)]">{children}</em>
        ),
        a: ({ href, children }) => (
          <a href={href} className="underline underline-offset-2 decoration-[var(--ink-faint)] hover:decoration-[var(--ink)] transition-colors" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mt-2 space-y-1.5 list-none">{children}</ul>,
        li: ({ children }) => (
          <li className="flex gap-2 text-[var(--ink-soft)] before:content-['—'] before:text-[var(--ink-faint)] before:flex-shrink-0">
            <span>{children}</span>
          </li>
        ),
        ol: ({ children }) => <ol className="mt-2 space-y-2 list-none counter-reset-item">{children}</ol>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h3: ({ children }) => (
          <h3 className="font-semibold text-[var(--ink)] mt-4 mb-1 first:mt-0 text-[15px]">{children}</h3>
        ),
        h2: ({ children }) => (
          <h2 className="font-display text-[17px] text-[var(--ink)] mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        /* Table — renders comparison tables cleanly */
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-[var(--border-strong)]">
            <table className="w-full text-[12px] border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--ink)] text-[var(--paper)]">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-[var(--border)]">{children}</tbody>,
        tr: ({ children }) => <tr className="even:bg-[var(--ivory)]">{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-left font-mono text-[9px] tracking-[0.2em] uppercase whitespace-nowrap">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2.5 text-[var(--ink-soft)] align-top">{children}</td>
        ),
        hr: () => <hr className="border-[var(--border)] my-3" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--terra)] pl-3 italic text-[var(--ink-muted)] my-2">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--ivory)] animate-pulse">
      <div className="h-40 bg-[var(--ink)]/6" />
      <div className="p-4 space-y-2.5">
        <div className="h-2 w-20 rounded-full bg-[var(--ink)]/6" />
        <div className="h-3.5 w-3/4 rounded-full bg-[var(--ink)]/8" />
        <div className="h-2.5 w-full rounded-full bg-[var(--ink)]/5" />
        <div className="h-2.5 w-2/3 rounded-full bg-[var(--ink)]/5" />
      </div>
    </div>
  );
}

function InlineListingCards({
  ids,
  onSelect,
}: {
  ids: string[];
  onSelect: (l: Listing) => void;
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
      <div className="space-y-3">
        {Array.from({ length: Math.min(ids.length, 3) }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <div className="space-y-3">
      {listings.map((listing, i) => (
        <ListingCard key={listing.id} listing={listing} index={i} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ListingCard({
  listing,
  index,
  onSelect,
}: {
  listing: Listing;
  index: number;
  onSelect: (l: Listing) => void;
}) {
  const excerpt = stripHtml(listing.description ?? "").slice(0, 160);
  const hasMore = stripHtml(listing.description ?? "").length > 160;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(listing)}
      className="w-full text-left group rounded-2xl border border-[var(--border-strong)] overflow-hidden bg-[var(--ivory)] hover:border-[var(--ink)] hover:shadow-[0_4px_24px_rgba(14,17,16,0.1)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-[var(--paper-soft)]">
        <Image
          src={
            listing.picture_url ??
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80"
          }
          alt={listing.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 640px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[8px] tracking-[0.22em] uppercase bg-black/45 text-white/90 px-2 py-1 rounded-full backdrop-blur-sm">
            {listing.city}
          </span>
          <span className="font-mono text-[8px] tracking-[0.18em] uppercase bg-black/45 text-white/75 px-2 py-1 rounded-full backdrop-blur-sm">
            {listing.property_type}
          </span>
        </div>

        {/* Price bottom-right */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-[var(--paper)] text-[var(--ink)] rounded-full px-3 py-1 flex items-baseline gap-1 shadow-sm">
            <span className="font-mono text-[13px] font-semibold">{formatPrice(listing.price_per_night)}</span>
            <span className="text-[10px] text-[var(--ink-muted)]">/night</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        {/* Name + rating */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display text-[15px] text-[var(--ink)] leading-snug group-hover:text-[var(--terra)] transition-colors">
            {listing.name}
          </h3>
          <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
            <span className="text-[var(--ochre)] text-[11px]">★</span>
            <span className="font-mono text-[12px] text-[var(--ink-mid)]">
              {listing.rating?.toFixed(1) ?? "—"}
            </span>
          </div>
        </div>

        {/* Description */}
        {excerpt && (
          <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed">
            {excerpt}{hasMore ? "…" : ""}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            {listing.max_guests != null && (
              <span className="text-[11px] text-[var(--ink-muted)]">{listing.max_guests} guests</span>
            )}
            {listing.bedrooms != null && (
              <span className="text-[11px] text-[var(--ink-muted)]">{listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}</span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--ink-mid)] group-hover:text-[var(--terra)] transition-colors">
            View on map
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </motion.button>
  );
}
