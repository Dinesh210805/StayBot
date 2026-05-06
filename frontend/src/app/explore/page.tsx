"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const CITIES = ["Bangkok", "London", "Cape Town"];
const TYPES = ["Apartment", "House", "Villa", "Condo", "Studio", "Loft"];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-[var(--gold)] text-xs">
      {"★".repeat(Math.round(rating))}
      <span className="text-[var(--text-muted)] ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  const img =
    listing.images?.[0] ??
    `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.6) }}
      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] hover:border-[rgba(201,169,110,0.35)] transition-all duration-400 hover:shadow-[0_0_40px_rgba(201,169,110,0.07)]"
    >
      {/* Image area */}
      <div className="relative h-56 overflow-hidden bg-[var(--bg-elevated)]">
        <img
          src={img}
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent opacity-60" />
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-full text-[10px] tracking-wider uppercase bg-[var(--bg-void)]/80 backdrop-blur-sm text-[var(--text-secondary)] border border-[var(--border)]">
            {listing.property_type}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--gold)]/90 text-[var(--bg-void)]">
            {formatPrice(listing.price_per_night)}/night
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-[var(--text-primary)] text-sm leading-snug flex-1 line-clamp-2 group-hover:text-white transition-colors">
            {listing.name}
          </h3>
        </div>

        <p className="text-[var(--text-muted)] text-xs mb-3">
          {listing.neighborhood ?? listing.city}, {listing.country}
        </p>

        <div className="flex items-center justify-between mb-4">
          <StarRating rating={listing.rating} />
          <span className="text-[var(--text-muted)] text-xs">
            {listing.review_count} reviews
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
          <span>{listing.guests} guests</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>{listing.bedrooms} bed</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>{listing.bathrooms} bath</span>
        </div>

        <Link
          href={`/explore/${listing.id}`}
          className="mt-4 block w-full py-2.5 rounded-xl text-xs font-medium text-center border border-[var(--border-bright)] text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
        >
          View Details
        </Link>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="h-56 shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded shimmer w-3/4" />
        <div className="h-3 rounded shimmer w-1/2" />
        <div className="h-3 rounded shimmer w-full" />
        <div className="h-9 rounded-xl shimmer mt-4" />
      </div>
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

  const limit = 12;

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
        limit,
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

  const handleFilter = () => {
    setPage(1);
    fetchListings();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-void)] pt-24">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--gold)] mb-3">
            Browse
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,5rem)] text-[var(--text-primary)] leading-tight">
            Find your
            <br />
            <em className="text-[var(--gold)]">perfect stay.</em>
          </h1>
          {total > 0 && !loading && (
            <p className="text-[var(--text-muted)] mt-3 text-sm">
              {total} properties found
            </p>
          )}
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-wrap gap-3 mb-10 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]"
        >
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="flex-1 min-w-[140px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--gold)] transition-colors"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="flex-1 min-w-[140px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--gold)] transition-colors"
          >
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] transition-colors"
          />

          <input
            type="number"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] transition-colors"
          />

          <input
            type="number"
            placeholder="Guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-24 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] transition-colors"
          />

          <button
            onClick={handleFilter}
            className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--bg-void)] text-sm font-medium hover:bg-[var(--gold-light)] transition-colors"
          >
            Search
          </button>

          {(city || type || minPrice || maxPrice || guests) && (
            <button
              onClick={() => {
                setCity("");
                setType("");
                setMinPrice("");
                setMaxPrice("");
                setGuests("");
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
          )}
        </motion.div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32"
            >
              <p className="font-display text-4xl text-[var(--text-muted)] mb-4">
                No properties found
              </p>
              <p className="text-[var(--text-secondary)] mb-8">
                Try adjusting your filters or{" "}
                <Link href="/chat" className="text-[var(--gold)] hover:underline">
                  ask the AI concierge
                </Link>
                .
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {total > limit && !loading && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-5 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}
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
