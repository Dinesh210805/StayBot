"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, type Listing } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import CalendarPicker, { type DateRange } from "@/components/booking/CalendarPicker";
import PriceBreakdown from "@/components/booking/PriceBreakdown";
import dynamic from "next/dynamic";

const NearbyMap = dynamic(() => import("@/components/map/NearbyMap"), { ssr: false });

function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      <span className="text-[var(--ochre)]">{"★".repeat(Math.round(rating))}</span>
      <span className="text-[var(--ink-muted)]">{"☆".repeat(5 - Math.round(rating))}</span>
      <span className="ml-1 text-[var(--ink-soft)]">{rating.toFixed(1)}</span>
    </span>
  );
}

function AmenityBadge({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)] bg-[var(--bone)] text-[var(--ink-soft)]">
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
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    api.listings
      .get(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] pt-24 flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 0.15, 0.3].map((d) => (
            <motion.div
              key={d}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d }}
              className="w-2 h-2 rounded-full bg-[var(--ochre)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[var(--paper)] pt-24 flex flex-col items-center justify-center gap-6">
        <p className="font-display text-4xl text-[var(--ink-muted)]">
          Property not found
        </p>
        <Link
          href="/explore"
          className="px-6 py-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const images = listing.picture_url
    ? [listing.picture_url]
    : [`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80`];

  const hasLocation =
    listing.latitude != null && listing.longitude != null;

  return (
    <div className="min-h-screen bg-[var(--paper)] pt-24 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-[var(--ink-muted)] mb-8"
        >
          <Link href="/explore" className="hover:text-[var(--ochre)] transition-colors">
            Explore
          </Link>
          <span>/</span>
          <Link
            href={`/explore?city=${listing.city}`}
            className="hover:text-[var(--ochre)] transition-colors"
          >
            {listing.city}
          </Link>
          <span>/</span>
          <span className="text-[var(--ink-soft)] line-clamp-1">{listing.name}</span>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* Left */}
          <div>
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl overflow-hidden aspect-[16/9] bg-[var(--bone)] mb-4"
            >
              <img
                src={images[0]}
                alt={listing.name}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Title & Rating */}
            <div className="mt-8">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="font-display text-[clamp(1.8rem,3vw,3rem)] text-[var(--ink)] leading-tight">
                  {listing.name}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--ink-muted)] mb-4">
                <StarRating rating={listing.rating} />
                <span>·</span>
                <span>{listing.review_count} reviews</span>
                <span>·</span>
                <span>
                  {listing.neighbourhood ?? listing.city}, {listing.country}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[var(--ink-soft)] border-y border-[var(--border)] py-4 mb-6">
                <span>{listing.max_guests} guests</span>
                <span>·</span>
                <span>{listing.bedrooms} bedrooms</span>
                <span>·</span>
                <span>{listing.bathrooms} bathrooms</span>
                <span>·</span>
                <span>{listing.property_type}</span>
              </div>

              <p
                className="text-[var(--ink-soft)] leading-relaxed mb-8"
                dangerouslySetInnerHTML={{
                  __html: (listing.description ?? "")
                    .replace(/<br\s*\/?>/gi, "<br/>")
                    .replace(/<(?!br\/?>)[^>]*>/gi, ""),
                }}
              />

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display text-xl text-[var(--ink)] mb-4">
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
              <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--ivory)] mb-8">
                <h2 className="font-display text-lg text-[var(--ink)] mb-1">
                  Hosted by {listing.host_name}
                </h2>
                <p className="text-xs text-[var(--ink-muted)]">
                  Host since {listing.host_since} · {listing.cancellation_policy} cancellation
                </p>
              </div>

              {/* Nearby Map */}
              {hasLocation && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="font-display text-xl text-[var(--ink)] mb-4">
                    Explore the neighborhood
                  </h2>
                  <NearbyMap
                    latitude={listing.latitude!}
                    longitude={listing.longitude!}
                    name={listing.name}
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Right — Booking panel */}
          <div className="lg:sticky lg:top-28 h-fit">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--ivory)] p-6"
            >
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-display text-3xl text-[var(--ochre)]">
                  {formatPrice(listing.price_per_night)}
                </span>
                <span className="text-[var(--ink-muted)] text-sm">/night</span>
              </div>

              {/* Calendar */}
              <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bone)]">
                <p className="text-[10px] tracking-widest uppercase text-[var(--ink-muted)] mb-3">
                  Select dates
                </p>
                <CalendarPicker
                  minNights={listing.min_nights ?? 1}
                  onRangeChange={setDateRange}
                />
              </div>

              {/* Guests */}
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bone)] mb-4">
                <p className="text-[10px] tracking-widest uppercase text-[var(--ink-muted)] mb-1">
                  Guests
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ochre)] hover:border-[var(--ochre)] transition-colors text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm text-[var(--ink)] tabular-nums w-6 text-center">
                    {guests}
                  </span>
                  <button
                    onClick={() => setGuests((g) => Math.min(listing.max_guests, g + 1))}
                    className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ochre)] hover:border-[var(--ochre)] transition-colors text-sm"
                  >
                    +
                  </button>
                  <span className="text-xs text-[var(--ink-muted)] ml-auto">
                    max {listing.max_guests}
                  </span>
                </div>
              </div>

              {/* Price breakdown */}
              {dateRange && (
                <PriceBreakdown
                  pricePerNight={listing.price_per_night}
                  dateRange={dateRange}
                  cleaningFee={listing.cleaning_fee}
                  serviceFee={listing.service_fee}
                />
              )}

              <Link
                href="/chat"
                className="block w-full py-4 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-sm font-medium text-center hover:bg-[var(--ink-soft)] transition-colors hover:shadow-[0_4px_24px_rgba(14,17,16,0.18)] mt-5 mb-3"
              >
                Book via AI Concierge
              </Link>

              <p className="text-center text-xs text-[var(--ink-muted)]">
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
                    <span className="text-[var(--ink-muted)]">{k}</span>
                    <span
                      className={`text-[var(--ink-soft)] ${
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
