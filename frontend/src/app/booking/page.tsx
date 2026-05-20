"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import CalendarPicker, { type DateRange } from "@/components/booking/CalendarPicker";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import { api } from "@/lib/api";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SHOWCASE_STAYS = [
  {
    id: "1",
    name: "The Golden Loft",
    city: "Bangkok",
    accent: "#C25A38",
    price: 65,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
    minNights: 2,
  },
  {
    id: "2",
    name: "Marylebone Townhouse",
    city: "London",
    accent: "#1F3A2C",
    price: 220,
    image: "https://images.unsplash.com/photo-1551776235-dde6d482980b?w=900&q=85",
    minNights: 3,
  },
  {
    id: "3",
    name: "Camps Bay House",
    city: "Cape Town",
    accent: "#4A8385",
    price: 180,
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=85",
    minNights: 2,
  },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function BookingPage() {
  const [stayIdx, setStayIdx] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [guests, setGuests] = useState(2);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ loading: boolean; error: string | null; success: boolean }>(
    { loading: false, error: null, success: false },
  );
  const stay = SHOWCASE_STAYS[stayIdx];

  useEffect(() => {
    api.sessions.create().then((s) => setSessionId(s.session_id)).catch(() => {});
  }, []);

  async function handleReserve() {
    if (!dateRange || !sessionId) return;
    setBooking({ loading: true, error: null, success: false });
    try {
      await api.bookings.create(
        Number(stay.id),
        formatDate(dateRange.from),
        formatDate(dateRange.to),
        guests,
        sessionId,
      );
      setBooking({ loading: false, error: null, success: true });
    } catch {
      setBooking({ loading: false, error: "Booking failed. Please try again.", success: false });
    }
  }

  const subtotal = dateRange ? stay.price * dateRange.nights : 0;
  const cleaning = dateRange ? 35 : 0;
  const service = dateRange ? Math.round(subtotal * 0.08) : 0;
  const total = subtotal + cleaning + service;

  return (
    <div className="min-h-screen bg-[var(--paper)] pt-32 pb-32">
      <div className="max-w-[1500px] mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-3">
            <Reveal>
              <p className="eyebrow">/03 · The Calendar</p>
            </Reveal>
          </div>
          <div className="md:col-span-9">
            <RevealLines
              as="h1"
              className="font-display text-[clamp(3rem,7vw,8rem)] leading-[0.86] tracking-[-0.03em]"
              lines={[
                <span key="1">Hold <em className="italic-display text-[var(--terra)]">your</em></span>,
                <span key="2"><em className="italic-display">dates</em>.</span>,
              ]}
            />
            <Reveal delay={0.2}>
              <p className="text-[var(--ink-soft)] text-lg max-w-2xl mt-8 leading-relaxed pretty">
                A simple booking flow — pick a stay, pick the nights, see the price. The concierge
                can do this faster, but if you'd rather drive, you're welcome here.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Stay selector — chips */}
        <Reveal delay={0.1}>
          <div className="border-y border-[var(--ink)] py-4 mb-12 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              <span className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--ink-muted)] mr-3 whitespace-nowrap">
                Booking for
              </span>
              {SHOWCASE_STAYS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { setStayIdx(i); setDateRange(null); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    stayIdx === i
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "bg-transparent text-[var(--ink)] hover:bg-[var(--paper-soft)]"
                  }`}
                  style={stayIdx === i ? {} : { border: `1px solid var(--border-strong)` }}
                >
                  <span className="mr-2 inline-block w-2 h-2 rounded-full align-middle" style={{ background: s.accent }} />
                  {s.name}
                  <span className="ml-2 opacity-50 text-xs">· {s.city}</span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Main: stay preview + calendar + summary */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left — stay image card */}
          <Reveal className="lg:col-span-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={stay.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.6, ease: easeOutExpo }}
                className="sticky top-32"
              >
                <div className="relative aspect-[3/4] rounded-sm overflow-hidden border border-[var(--ink)] img-grain">
                  <Image
                    src={stay.image}
                    alt={stay.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 35vw"
                  />
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between font-mono text-[10px] tracking-[0.3em] uppercase text-white/85">
                    <span>Plate 002</span>
                    <span>{stay.city.toUpperCase()}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ color: stay.accent }}>
                      Featured stay
                    </p>
                    <h2 className="font-display text-3xl text-white leading-tight">{stay.name}</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3 font-mono text-[11px] uppercase tracking-wider">
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--ink-muted)]">Per night</span>
                    <span className="text-[var(--ink)]">${stay.price}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--ink-muted)]">Min stay</span>
                    <span className="text-[var(--ink)]">{stay.minNights} nights</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--ink-muted)]">Max guests</span>
                    <span className="text-[var(--ink)]">4 people</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Reveal>

          {/* Center — calendar */}
          <Reveal delay={0.1} className="lg:col-span-5">
            <div className="border border-[var(--ink)] rounded-sm bg-[var(--ivory)] p-6 md:p-8 shadow-[6px_6px_0_0_var(--ink)]">
              <CalendarPicker
                key={stay.id}
                minNights={stay.minNights}
                onRangeChange={setDateRange}
                variant="compact"
              />
            </div>

            {/* Guests */}
            <div className="mt-5 flex items-center justify-between border border-[var(--ink)] rounded-sm bg-[var(--ivory)] p-5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--ink-muted)]">Guests</p>
                <p className="font-display text-2xl mt-1">
                  {guests} <span className="text-[var(--ink-muted)] text-sm font-mono">people</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="w-9 h-9 rounded-full border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  aria-label="Fewer guests"
                >
                  −
                </button>
                <button
                  onClick={() => setGuests((g) => Math.min(8, g + 1))}
                  className="w-9 h-9 rounded-full border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  aria-label="More guests"
                >
                  +
                </button>
              </div>
            </div>
          </Reveal>

          {/* Right — receipt */}
          <Reveal delay={0.2} className="lg:col-span-3">
            <div className="border border-[var(--ink)] rounded-sm bg-[var(--ivory)] sticky top-32 overflow-hidden">
              <div className="bg-[var(--ink)] text-[var(--paper)] p-5">
                <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-60 mb-1">Receipt</p>
                <p className="font-display text-2xl">Your stay</p>
              </div>

              <div className="p-5 space-y-4">
                <AnimatePresence mode="wait">
                  {dateRange ? (
                    <motion.div
                      key="filled"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 text-sm"
                    >
                      <div className="flex justify-between text-[var(--ink-soft)]">
                        <span>${stay.price} × {dateRange.nights} nights</span>
                        <span className="text-[var(--ink)]">${subtotal}</span>
                      </div>
                      <div className="flex justify-between text-[var(--ink-soft)]">
                        <span>Cleaning</span>
                        <span className="text-[var(--ink)]">${cleaning}</span>
                      </div>
                      <div className="flex justify-between text-[var(--ink-soft)]">
                        <span>Service (8%)</span>
                        <span className="text-[var(--ink)]">${service}</span>
                      </div>
                      <div className="border-t border-[var(--ink)] pt-3 flex justify-between font-display text-2xl">
                        <span>Total</span>
                        <span className="text-[var(--terra)]">${total}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-[var(--ink-muted)] py-2 leading-relaxed"
                    >
                      Pick your dates to see the total. We don't charge until the host confirms.
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleReserve}
                  disabled={!dateRange || booking.loading || booking.success}
                  className="w-full mt-2 px-5 py-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {booking.loading ? "Booking…" : booking.success ? "Booked!" : "Reserve"}
                  <span className="w-7 h-7 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center text-xs group-enabled:group-hover:rotate-[-45deg] transition-transform duration-300">→</span>
                </button>
                {booking.success && (
                  <p className="text-center text-xs text-emerald-500 mt-2">
                    Booking request sent! Check the concierge chat for confirmation.
                  </p>
                )}
                {booking.error && (
                  <p className="text-center text-xs text-red-400 mt-2">{booking.error}</p>
                )}

                <Link
                  href="/chat"
                  className="block text-center text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline-offset-4 hover:underline mt-2"
                >
                  Or ask the concierge instead
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bottom strip */}
        <div className="mt-32 grid md:grid-cols-3 gap-px bg-[var(--ink)] border border-[var(--ink)]">
          {[
            ["Free cancellation", "Up to 24 hours before check-in"],
            ["No payment yet", "Card only authorised when host confirms"],
            ["Concierge support", "24/7 in-conversation help"],
          ].map(([t, d]) => (
            <div key={t} className="bg-[var(--paper)] p-8">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--ink-muted)] mb-2">{t}</p>
              <p className="font-display text-xl">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
