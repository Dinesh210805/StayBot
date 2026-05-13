"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Bath, BedDouble, Heart, Users } from "lucide-react";
import { api, type Listing } from "@/lib/api";
import { DESTINATIONS } from "@/lib/destinations";
import { formatPrice } from "@/lib/utils";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import Magnetic from "@/components/fx/Magnetic";

const CITIES = DESTINATIONS.map((d) => d.name);
const TYPES = ["Apartment", "House", "Villa", "Condo", "Studio", "Loft"];
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] tracking-wider">
      <span className="text-[var(--amber)]">★</span>
      <span className="text-[var(--ink-soft)]">{rating.toFixed(1)}</span>
    </span>
  );
}

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  const img = listing.picture_url ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.4), ease: easeOutExpo }}
    >
      <Link
        href={`/explore/${listing.id}`}
        className="group block relative overflow-hidden rounded-[28px] border border-black/[0.04] bg-white p-3 shadow-[0_24px_80px_rgba(14,17,16,0.10)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(14,17,16,0.16)]"
      >
        <div className="relative aspect-[1.08/1] overflow-hidden rounded-[22px] bg-[var(--bg-elevated)]">
          <Image
            src={img}
            alt={listing.name}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 opacity-70" />

          {/* Top metadata */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.10)] backdrop-blur-md">
              {listing.rating >= 4.8 ? "Guest Favourite" : listing.property_type}
            </span>
            <span className="flex h-10 w-10 items-center justify-center text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110">
              <Heart size={30} fill="currentColor" strokeWidth={0} />
            </span>
          </div>

          {/* Hover arrow */}
          <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--amber)] text-[var(--bg-void)] text-xl opacity-0 shadow-[0_14px_30px_rgba(0,0,0,0.18)] scale-75 transition-all duration-500 group-hover:opacity-100 group-hover:scale-100">
            →
          </div>
        </div>

        <div className="px-3 pb-3 pt-5">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ochre)]">
                {listing.neighbourhood ?? listing.city} · {listing.country}
              </p>
              <h3 className="line-clamp-1 font-display text-[1.65rem] leading-none tracking-tight text-[var(--ink)]">
                {listing.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl leading-none tracking-tight text-[var(--ink)]">
                {formatPrice(listing.price_per_night)}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">/night</p>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="line-clamp-1 text-[15px] text-[var(--ink-muted)]">
              {listing.room_type} · {listing.property_type} · curated stay
            </p>
            <StarRating rating={listing.rating} />
          </div>

          <div className="grid grid-cols-3 items-center border-t border-[var(--border-strong)] pt-4 text-[var(--ink-muted)]">
            <div className="flex items-center gap-1.5">
              <BedDouble size={18} strokeWidth={1.7} />
              <span className="text-sm">Bed: <b className="font-semibold text-[var(--ink)]">{listing.bedrooms}</b></span>
            </div>
            <div className="flex items-center justify-center gap-1.5 border-l border-[var(--border-strong)]">
              <Bath size={18} strokeWidth={1.7} />
              <span className="text-sm">Bath: <b className="font-semibold text-[var(--ink)]">{listing.bathrooms}</b></span>
            </div>
            <div className="flex items-center justify-end gap-1.5 border-l border-[var(--border-strong)]">
              <Users size={18} strokeWidth={1.7} />
              <span className="text-sm">Max: <b className="font-semibold text-[var(--ink)]">{listing.max_guests}</b></span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="aspect-[4/5] shimmer" />
    </div>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [guests, setGuests] = useState("");

  const perPage = 12;

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listings.list({
        city: city || undefined,
        property_type: type || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        guests: guests ? Number(guests) : undefined,
        page,
        per_page: perPage,
      });
      setListings(res.listings ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [city, type, minPrice, maxPrice, guests, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasFilters = city || type || minPrice || maxPrice || guests;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] pt-32 pb-32">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-6 mb-16">
        <div className="grid md:grid-cols-12 gap-12 items-end">
          <div className="md:col-span-3">
            <Reveal>
              <p className="eyebrow">Index · All stays</p>
            </Reveal>
          </div>
          <div className="md:col-span-9">
            <RevealLines
              as="h1"
              className="font-display text-[clamp(3rem,7vw,8rem)] leading-[0.86] tracking-[-0.03em]"
              lines={["Pick a place", <span key="b">to <em className="text-[var(--amber)] italic">disappear</em>.</span>]}
            />
            {!loading && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-mono text-xs tracking-widest text-[var(--text-muted)] uppercase mt-6"
              >
                {total} stays · curated by hand
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1400px] mx-auto px-6 mb-12">
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 flex flex-wrap items-center gap-2">
            <select
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
              className="flex-1 min-w-[140px] bg-transparent border-0 px-4 py-2.5 text-sm text-[var(--text-primary)] cursor-pointer focus:outline-none rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <option value="">Any city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <span className="w-px h-6 bg-[var(--border)]" />

            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="flex-1 min-w-[140px] bg-transparent border-0 px-4 py-2.5 text-sm text-[var(--text-primary)] cursor-pointer focus:outline-none rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <option value="">Any type</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <span className="w-px h-6 bg-[var(--border)]" />

            <input
              type="number"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-24 bg-transparent border-0 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            />

            <input
              type="number"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-24 bg-transparent border-0 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            />

            <input
              type="number"
              placeholder="Guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-24 bg-transparent border-0 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            />

            <button
              onClick={() => { setPage(1); fetchListings(); }}
              className="ml-auto px-5 py-2.5 rounded-xl bg-[var(--amber)] text-[var(--bg-void)] text-sm font-medium hover:bg-[var(--amber-bright)] transition-colors"
            >
              Search
            </button>

            {hasFilters && (
              <button
                onClick={() => {
                  setCity(""); setType(""); setMinPrice(""); setMaxPrice(""); setGuests(""); setPage(1);
                }}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </Reveal>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-32"
            >
              <p className="font-display text-5xl text-[var(--text-muted)] mb-6 italic">
                Nothing yet
              </p>
              <p className="text-[var(--text-secondary)] mb-10">
                Try widening your search, or{" "}
                <Link href="/chat" className="text-[var(--amber)] underline-offset-4 hover:underline">
                  ask the concierge
                </Link>
                .
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
            </div>
          )}
        </AnimatePresence>

        {total > perPage && !loading && (
          <div className="flex items-center justify-center gap-3 mt-16">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--amber)] hover:border-[var(--amber)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <span className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
              {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--amber)] hover:border-[var(--amber)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* CTA strip */}
      <div className="max-w-[1400px] mx-auto px-6 mt-32 pt-16 border-t border-[var(--border)]">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-4">Don't see what you want?</p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight">
              Tell the concierge.
            </h2>
          </div>
          <div className="flex md:justify-end">
            <Magnetic strength={0.25}>
              <Link
                href="/chat"
                className="group inline-flex items-center gap-2 pl-7 pr-1.5 py-1.5 rounded-full bg-[var(--amber)] text-[var(--bg-void)] text-sm font-medium hover:bg-[var(--amber-bright)] transition-all"
              >
                Open a conversation
                <span className="w-9 h-9 rounded-full bg-[var(--bg-void)] text-[var(--amber)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform">
                  →
                </span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
