"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Listing } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PlaceResult {
  name: string;
  distance: number;
  lat: number;
  lon: number;
  cuisine?: string;
  type?: string;
}

interface NearbyPlaces {
  restaurants: PlaceResult[];
  cafes: PlaceResult[];
  attractions: PlaceResult[];
}

const PLACE_CATEGORIES = [
  { key: "restaurants" as const, type: "restaurant", emoji: "🍽", label: "Restaurants" },
  { key: "cafes" as const, type: "cafe", emoji: "☕", label: "Cafes" },
  { key: "attractions" as const, type: "museum", emoji: "🏛", label: "Attractions" },
];

const FALLBACK: Record<string, Omit<PlaceResult, "lat" | "lon">[]> = {
  restaurant: [
    { name: "Maison de Verre", distance: 180, cuisine: "French bistro" },
    { name: "Sora Ramen", distance: 240, cuisine: "Japanese" },
    { name: "Casa Maria", distance: 360, cuisine: "Italian" },
    { name: "Le Petit Comptoir", distance: 440, cuisine: "Wine bar" },
  ],
  cafe: [
    { name: "Brew Society", distance: 150, cuisine: "Specialty coffee" },
    { name: "The Quiet Corner", distance: 280, cuisine: "Third-wave espresso" },
    { name: "Madeleine & Co", distance: 390, cuisine: "Patisserie" },
    { name: "Noon Coffee", distance: 500, cuisine: "Cold brew" },
  ],
  museum: [
    { name: "Heritage Museum", distance: 310 },
    { name: "Old City Gate", distance: 450 },
    { name: "Botanical Park", distance: 570 },
    { name: "The Conservatory", distance: 790 },
  ],
};

type LeafletMap = { map: import("leaflet").Map; L: typeof import("leaflet") };

interface Props {
  listing: Listing & { latitude: number; longitude: number };
  compact?: boolean;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ConciergeMap({ listing, compact = false }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletMap | null>(null);
  const placeMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [places, setPlaces] = useState<NearbyPlaces>({ restaurants: [], cafes: [], attractions: [] });
  const [activeTab, setActiveTab] = useState(0);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Init Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || leafletRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [listing.latitude, listing.longitude],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      const homeIcon = L.divIcon({
        html: `<div style="width:18px;height:18px;background:#0E1110;border:3px solid #F2EBDB;border-radius:50%;box-shadow:0 2px 8px rgba(14,17,16,0.45);"></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([listing.latitude, listing.longitude], { icon: homeIcon })
        .addTo(map)
        .bindPopup(`<b>${listing.name}</b>`)
        .openPopup();

      leafletRef.current = { map, L };
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, [listing.latitude, listing.longitude, listing.name]);

  // Fetch restaurants, cafes and attractions in a single request
  useEffect(() => {
    setLoadingPlaces(true);
    const { latitude, longitude } = listing;

    fetch(
      `${API_BASE}/api/nearby?lat=${latitude}&lon=${longitude}&type=restaurant,cafe,museum&radius=800&limit=8`
    )
      .then((r) => (r.ok ? r.json() : { places: [] }))
      .then((d: { places: PlaceResult[] }) => {
        const list = d.places ?? [];
        if (list.length === 0) throw new Error("empty");
        const restaurants = list.filter((p) => p.type === "restaurant");
        const cafes = list.filter((p) => p.type === "cafe");
        const attractions = list.filter((p) => p.type === "museum" || p.type === "attraction");
        setPlaces({ restaurants, cafes, attractions });
        setUsingFallback(false);
      })
      .catch(() => {
        setPlaces({
          restaurants: FALLBACK.restaurant.map((p) => ({ ...p, lat: 0, lon: 0 })),
          cafes: FALLBACK.cafe.map((p) => ({ ...p, lat: 0, lon: 0 })),
          attractions: FALLBACK.museum.map((p) => ({ ...p, lat: 0, lon: 0 })),
        });
        setUsingFallback(true);
      })
      .finally(() => setLoadingPlaces(false));
  }, [listing.latitude, listing.longitude]);

  // Sync place markers when tab changes
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const { map, L } = leafletRef.current;

    placeMarkersRef.current.forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = [];

    const cat = PLACE_CATEGORIES[activeTab];
    const currentPlaces = places[cat.key];

    currentPlaces.forEach((place) => {
      if (!place.lat || !place.lon || usingFallback) return;
      const icon = L.divIcon({
        html: `<div style="font-size:16px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">${cat.emoji}</div>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([place.lat, place.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<b>${place.name}</b><br><span style="font-size:11px;color:#666">${place.distance}m away</span>`
        );
      placeMarkersRef.current.push(marker);
    });
  }, [places, activeTab, mapReady, usingFallback]);

  const activePlaces = places[PLACE_CATEGORIES[activeTab].key];
  const cleanDescription = stripHtml(listing.description ?? "");

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Listing header — hidden in compact (accordion) mode, already shown in parent card */}
      {!compact && (
        <div className="px-5 py-4 border-b border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]">
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-60 mb-1">
            {listing.city} · {listing.property_type}
          </p>
          <p className="font-display text-lg italic-display leading-tight mb-2">{listing.name}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">★ {listing.rating?.toFixed(1)}</span>
            <span className="font-mono text-sm">{formatPrice(listing.price_per_night)}<span className="opacity-60 text-xs">/night</span></span>
          </div>
        </div>
      )}

      {/* Leaflet map */}
      <div className={`relative ${compact ? "h-44" : "h-56"} w-full flex-shrink-0`}>
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        {!mapReady && (
          <div className="absolute inset-0 bg-[var(--paper-soft)] flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 0.1, 0.2].map((d) => (
                <motion.div
                  key={d}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d }}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nearby places tabs */}
      <div className="flex border-b border-[var(--ink)] bg-[var(--paper)] flex-shrink-0">
        {PLACE_CATEGORIES.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-3 text-[10px] font-mono tracking-[0.18em] uppercase transition-colors ${
              activeTab === i
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
            }`}
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Place list */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0 min-h-[100px]">
        {usingFallback && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase bg-[var(--ochre)] text-[var(--ink)] px-2 py-0.5 rounded-full">
              Sample data
            </span>
            <span className="text-[10px] text-[var(--ink-muted)]">Live data unavailable</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {loadingPlaces ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 py-4 justify-center">
              {[0, 0.1, 0.2].map((d) => (
                <motion.div key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d }} className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" />
              ))}
            </motion.div>
          ) : activePlaces.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--ink-muted)] py-4 text-center">
              No {PLACE_CATEGORIES[activeTab].label.toLowerCase()} found nearby
            </motion.p>
          ) : (
            <motion.div key={`tab-${activeTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0 divide-y divide-[var(--border)]">
              {activePlaces.slice(0, 4).map((place, i) => (
                <motion.div
                  key={place.name + i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="text-base">{PLACE_CATEGORIES[activeTab].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--ink)] font-medium truncate">{place.name}</p>
                    {place.cuisine && (
                      <p className="text-[11px] text-[var(--ink-muted)] truncate">{place.cuisine}</p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[var(--terra)] shrink-0">{place.distance}m</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Description */}
      {cleanDescription && (
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--ink-muted)] mb-2">About this stay</p>
          <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed line-clamp-4">{cleanDescription}</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 py-4 mt-auto">
        <Link
          href={`/explore/${listing.id}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--terra)] transition-colors group"
        >
          View full details
          <span className="w-6 h-6 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center text-xs group-hover:rotate-[-45deg] transition-transform duration-300">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
