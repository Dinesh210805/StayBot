"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Reveal, RevealLines } from "@/components/fx/Reveal";
import Magnetic from "@/components/fx/Magnetic";

const CITIES = ["Bangkok", "London", "Cape Town"];
const TYPES = ["Apartment", "House", "Villa", "Condo", "Studio", "Loft"];
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] tracking-wider">
      <span className="text-[var(--amber)]">★</span>
      <span className="text-[var(--text-primary)]">{rating.toFixed(1)}</span>
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
        className="group block relative rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--border-bright)] bg-[var(--bg-card)] transition-all duration-500 hover:shadow-[0_0_50px_rgba(233,178,108,0.08)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--bg-elevated)]">
          <Image
            src={img}
            alt={listing.name}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] via-[var(--bg-void)]/30 to-transparent opacity-90" />

          {/* Top metadata */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between font-mono text-[10px] tracking-widest uppercase">
            <span className="px-2 py-1 rounded-full bg-[var(--bg-void)]/70 backdrop-blur-md text-white/80 border border-white/10">
              {listing.property_type}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[var(--amber)] text-[var(--bg-void)] font-medium">
              {formatPrice(listing.price_per_night)}<span className="opacity-60"> /n</span>
            </span>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--amber)] mb-2 opacity-80">
              {listing.neighbourhood ?? listing.city} · {listing.country}
            </p>
            <h3 className="font-display text-xl leading-snug mb-3 line-clamp-2 group-hover:translate-y-0 transition-transform">
              {listing.name}
            </h3>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <StarRating rating={listing.rating} />
              <span className="font-mono tracking-wider">
                {listing.max_guests} ppl · {listing.bedrooms} bed
              </span>
            </div>
          </div>

          {/* Hover arrow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[var(--amber)] text-[var(--bg-void)] flex items-center justify-center text-xl opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500">
            →
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
