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
  { key: "restaurants" as const, type: "restaurant", emoji: "🍽", label: "Restaurants", color: "#C25A38" },
  { key: "cafes" as const, type: "cafe", emoji: "☕", label: "Cafes", color: "#B58231" },
  { key: "attractions" as const, type: "museum", emoji: "🏛", label: "Attractions", color: "#4A8385" },
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
  const polylinesRef = useRef<import("leaflet").Polyline[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [places, setPlaces] = useState<NearbyPlaces>({ restaurants: [], cafes: [], attractions: [] });
  const [activeTab, setActiveTab] = useState(0);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Init Leaflet map with satellite tiles
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
        zoomControl: false,
        attributionControl: false,
      });

      // Satellite base layer (Esri WorldImagery)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        }
      ).addTo(map);

      // Label overlay for street names / POI names
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.8 }
      ).addTo(map);

      // Zoom control bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution bottom-left, small
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      // Hotel / listing marker
      const homeIcon = L.divIcon({
        html: `<div style="width:22px;height:22px;background:#F2EBDB;border:3px solid #0E1110;border-radius:50%;box-shadow:0 2px 12px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;"><span style="font-size:11px;line-height:1">🏠</span></div>`,
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([listing.latitude, listing.longitude], { icon: homeIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`<b style="font-size:13px">${listing.name}</b><br><span style="font-size:11px;color:#666">${listing.city}</span>`)
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
  }, [listing.latitude, listing.longitude, listing.name, listing.city]);

  // Fetch nearby places
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

  // Sync place markers + polylines when tab or places change
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const { map, L } = leafletRef.current;

    // Clear old markers and lines
    placeMarkersRef.current.forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = [];
    polylinesRef.current.forEach((l) => map.removeLayer(l));
    polylinesRef.current = [];

    if (usingFallback) return;

    const cat = PLACE_CATEGORIES[activeTab];
    const currentPlaces = places[cat.key];

    currentPlaces.forEach((place) => {
      if (!place.lat || !place.lon) return;

      // Dashed polyline from hotel to place
      const line = L.polyline(
        [[listing.latitude, listing.longitude], [place.lat, place.lon]],
        { color: cat.color, weight: 1.5, dashArray: "5 5", opacity: 0.65 }
      ).addTo(map);
      polylinesRef.current.push(line);

      // Place marker
      const icon = L.divIcon({
        html: `<div style="background:${cat.color};border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.45)">${cat.emoji}</div>`,
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([place.lat, place.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<b style="font-size:13px">${place.name}</b><br><span style="font-size:11px;color:#888">${place.distance}m away</span>${place.cuisine ? `<br><span style="font-size:11px;color:#999">${place.cuisine}</span>` : ""}`
        );
      placeMarkersRef.current.push(marker);
    });
  }, [places, activeTab, mapReady, usingFallback, listing.latitude, listing.longitude]);

  const activePlaces = places[PLACE_CATEGORIES[activeTab].key];
  const cleanDescription = stripHtml(listing.description ?? "");
  const mapHeight = compact ? "h-56" : "h-72";

  return (
    <div className="flex flex-col bg-[var(--paper-soft)]">
      {/* Listing header — only in non-compact mode */}
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

      {/* Satellite map */}
      <div className={`relative ${mapHeight} w-full flex-shrink-0`}>
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        {!mapReady && (
          <div className="absolute inset-0 bg-[var(--ink)]/80 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 0.1, 0.2].map((d) => (
                <motion.div
                  key={d}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d }}
                  className="w-1.5 h-1.5 rounded-full bg-white"
                />
              ))}
            </div>
          </div>
        )}
        {/* Satellite badge */}
        {mapReady && (
          <div className="absolute top-2 left-2 z-[1000] pointer-events-none">
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase bg-black/50 text-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Satellite
            </span>
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-[var(--border)] bg-[var(--ivory)] flex-shrink-0">
        {PLACE_CATEGORIES.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2.5 text-[9px] font-mono tracking-[0.18em] uppercase transition-colors ${
              activeTab === i
                ? "text-[var(--paper)] font-semibold"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
            }`}
            style={activeTab === i ? { background: cat.color } : {}}
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Place list */}
      <div className="flex-shrink-0 min-h-[100px] bg-[var(--ivory)]">
        {usingFallback && (
          <div className="flex items-center gap-1.5 px-4 pt-2.5">
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase bg-[var(--ochre)]/20 text-[var(--ochre-deep)] px-2 py-0.5 rounded-full">
              Sample data
            </span>
            <span className="text-[10px] text-[var(--ink-muted)]">Live data unavailable</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {loadingPlaces ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 py-6 justify-center">
              {[0, 0.1, 0.2].map((d) => (
                <motion.div key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d }} className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" />
              ))}
            </motion.div>
          ) : activePlaces.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--ink-muted)] py-6 text-center">
              No {PLACE_CATEGORIES[activeTab].label.toLowerCase()} found nearby
            </motion.p>
          ) : (
            <motion.div
              key={`tab-${activeTab}`}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              className="divide-y divide-[var(--border)]"
            >
              {activePlaces.slice(0, 4).map((place, i) => (
                <motion.div
                  key={place.name + i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${PLACE_CATEGORIES[activeTab].color}18` }}
                  >
                    {PLACE_CATEGORIES[activeTab].emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--ink)] font-medium truncate leading-tight">{place.name}</p>
                    {place.cuisine && (
                      <p className="text-[11px] text-[var(--ink-muted)] truncate leading-tight mt-0.5">{place.cuisine}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className="font-mono text-[11px] font-semibold"
                      style={{ color: PLACE_CATEGORIES[activeTab].color }}
                    >
                      {place.distance}m
                    </span>
                    <span className="text-[9px] text-[var(--ink-faint)] font-mono tracking-wide">away</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Description */}
      {cleanDescription && (
        <div className="px-4 py-3.5 border-t border-[var(--border)] bg-[var(--paper)]">
          <p className="font-mono text-[8px] tracking-[0.3em] uppercase text-[var(--ink-muted)] mb-2">About this stay</p>
          <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed line-clamp-3">{cleanDescription}</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 py-3.5 border-t border-[var(--border)] bg-[var(--paper)]">
        <Link
          href={`/explore/${listing.id}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-medium hover:bg-[var(--terra)] transition-colors group"
        >
          View full details
          <span className="w-5 h-5 rounded-full bg-[var(--paper)]/15 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
