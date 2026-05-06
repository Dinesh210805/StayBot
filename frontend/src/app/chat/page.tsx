"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { api, type ChatMessage } from "@/lib/api";
import Link from "next/link";

const STARTERS = [
  "Find me a cozy apartment in Bangkok under $70/night",
  "Luxury villa in Cape Town with ocean views for 4 guests",
  "Budget-friendly studio in London near the tube",
  "Best rated properties in Bangkok with a pool",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.div
          key={delay}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay }}
          className="w-2 h-2 rounded-full bg-[var(--gold)]"
        />
      ))}
    </div>
  );
}

function Message({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1 ${
          isUser
            ? "bg-[var(--gold)]/20 border border-[var(--gold)]/40 text-[var(--gold)]"
            : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--gold)]"
        }`}
      >
        {isUser ? "U" : "S"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-5 py-4 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--gold)]/12 text-[var(--text-primary)] border border-[var(--gold)]/20 rounded-tr-sm"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-tl-sm"
        }`}
      >
        {msg.loading ? (
          <TypingDots />
        ) : (
          <ReactMarkdown
            components={{
              strong: ({ children }) => (
                <strong className="text-[var(--text-primary)] font-medium">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[var(--gold)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="mt-2 space-y-1 list-none">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex gap-2 before:content-['·'] before:text-[var(--gold)]">
                  {children}
                </li>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome! I'm your StayBot AI concierge. I can help you find the perfect accommodation in **Bangkok**, **London**, or **Cape Town**.\n\nTell me about your ideal stay — dates, budget, number of guests, or what kind of vibe you're looking for.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      const loadingMsg: Message = {
        id: "loading",
        role: "assistant",
        content: "",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setSending(true);

      try {
        const res = await api.chat.send(text.trim(), sessionId);
        setSessionId(res.session_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading"
              ? { id: crypto.randomUUID(), role: "assistant", content: res.response }
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
                    "Sorry, I had trouble connecting to the server. Please check that the backend is running and try again.",
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
    <div className="min-h-screen bg-[var(--bg-void)] flex flex-col">
      {/* Header */}
      <div className="pt-24 pb-6 border-b border-[var(--border)] bg-[var(--bg-deep)]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl text-[var(--text-primary)]"
            >
              AI <span className="text-[var(--gold)]">Concierge</span>
            </motion.h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Powered by StayBot · Bangkok · London · Cape Town
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionId && (
              <button
                onClick={async () => {
                  if (sessionId) {
                    try {
                      await api.sessions.delete(sessionId);
                    } catch {
                      /* ignore */
                    }
                  }
                  setSessionId(undefined);
                  setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      content:
                        "Fresh start! Tell me about your ideal stay in Bangkok, London, or Cape Town.",
                    },
                  ]);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
            <Link
              href="/explore"
              className="text-xs text-[var(--gold)] border border-[var(--gold)]/30 rounded-full px-3 py-1.5 hover:bg-[var(--gold)]/10 transition-colors"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6 overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
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
            className="max-w-4xl mx-auto w-full px-6 pb-4"
          >
            <p className="text-xs text-[var(--text-muted)] mb-3 tracking-wide">
              Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-4 py-2 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--gold)] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-deep)]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] px-5 py-3 focus-within:border-[var(--gold)]/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your ideal stay…"
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent text-[var(--text-primary)] text-sm resize-none outline-none placeholder:text-[var(--text-muted)] leading-relaxed max-h-40 overflow-y-auto"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-[var(--gold)] text-[var(--bg-void)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--gold-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
