"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      <span className="text-[var(--gold)]">{"★".repeat(Math.round(rating))}</span>
      <span className="text-[var(--text-muted)]">{"☆".repeat(5 - Math.round(rating))}</span>
      <span className="ml-1 text-[var(--text-secondary)]">{rating.toFixed(1)}</span>
    </span>
  );
}

function AmenityBadge({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

export default function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    api.listings
      .get(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] pt-24 flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 0.15, 0.3].map((d) => (
            <motion.div
              key={d}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d }}
              className="w-2 h-2 rounded-full bg-[var(--gold)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] pt-24 flex flex-col items-center justify-center gap-6">
        <p className="font-display text-4xl text-[var(--text-muted)]">
          Property not found
        </p>
        <Link
          href="/explore"
          className="px-6 py-3 rounded-full bg-[var(--gold)] text-[var(--bg-void)] text-sm font-medium"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const images =
    listing.images?.length > 0
      ? listing.images
      : [`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80`];

  return (
    <div className="min-h-screen bg-[var(--bg-void)] pt-24 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-8"
        >
          <Link href="/explore" className="hover:text-[var(--gold)] transition-colors">
            Explore
          </Link>
          <span>/</span>
          <Link
            href={`/explore?city=${listing.city}`}
            className="hover:text-[var(--gold)] transition-colors"
          >
            {listing.city}
          </Link>
          <span>/</span>
          <span className="text-[var(--text-secondary)] line-clamp-1">{listing.name}</span>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* Left */}
          <div>
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl overflow-hidden aspect-[16/9] bg-[var(--bg-elevated)] mb-4"
            >
              <img
                src={images[activeImg]}
                alt={listing.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {images.slice(0, 8).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImg
                        ? "border-[var(--gold)]"
                        : "border-[var(--border)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Rating */}
            <div className="mt-8">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="font-display text-[clamp(1.8rem,3vw,3rem)] text-[var(--text-primary)] leading-tight">
                  {listing.name}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-4">
                <StarRating rating={listing.rating} />
                <span>·</span>
                <span>{listing.review_count} reviews</span>
                <span>·</span>
                <span>
                  {listing.neighborhood ?? listing.city}, {listing.country}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] border-y border-[var(--border)] py-4 mb-6">
                <span>{listing.guests} guests</span>
                <span>·</span>
                <span>{listing.bedrooms} bedrooms</span>
                <span>·</span>
                <span>{listing.bathrooms} bathrooms</span>
                <span>·</span>
                <span>{listing.property_type}</span>
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
                {listing.description}
              </p>

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display text-xl text-[var(--text-primary)] mb-4">
                    Amenities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((a) => (
                      <AmenityBadge key={a} label={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* Host */}
              <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
                <h2 className="font-display text-lg text-[var(--text-primary)] mb-1">
                  Hosted by {listing.host_name}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Host since {listing.host_since} · {listing.cancellation_policy} cancellation
                </p>
              </div>
            </div>
          </div>

          {/* Right — Booking panel */}
          <div className="lg:sticky lg:top-28 h-fit">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-3xl text-[var(--gold)]">
                  {formatPrice(listing.price_per_night)}
                </span>
                <span className="text-[var(--text-muted)] text-sm">/night</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                    <p className="text-[10px] tracking-widest uppercase text-[var(--text-muted)] mb-1">
                      Check-in
                    </p>
                    <input
                      type="date"
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                    <p className="text-[10px] tracking-widest uppercase text-[var(--text-muted)] mb-1">
                      Check-out
                    </p>
                    <input
                      type="date"
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <p className="text-[10px] tracking-widest uppercase text-[var(--text-muted)] mb-1">
                    Guests
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={listing.guests}
                    defaultValue={1}
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <Link
                href="/chat"
                className="block w-full py-4 rounded-xl bg-[var(--gold)] text-[var(--bg-void)] text-sm font-medium text-center hover:bg-[var(--gold-light)] transition-colors hover:shadow-[0_0_30px_rgba(201,169,110,0.3)] mb-3"
              >
                Book via AI Concierge
              </Link>

              <p className="text-center text-xs text-[var(--text-muted)]">
                Min {listing.min_nights} night{listing.min_nights > 1 ? "s" : ""} ·{" "}
                {listing.cancellation_policy} cancellation
              </p>

              <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-2">
                {[
                  ["City", `${listing.city}, ${listing.country}`],
                  ["Type", listing.property_type],
                  ["Availability", listing.availability ? "Available" : "Unavailable"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">{k}</span>
                    <span
                      className={`text-[var(--text-secondary)] ${
                        k === "Availability" && listing.availability
                          ? "text-emerald-400"
                          : ""
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
