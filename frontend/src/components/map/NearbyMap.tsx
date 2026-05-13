"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PlaceResult {
  name: string;
  distance: number;
  lat: number;
  lon: number;
  cuisine?: string;
  hours?: string;
}

interface DisplayPlace extends PlaceResult {
  category: string;
  emoji: string;
}

const CATEGORIES = [
  { label: "Restaurants", type: "restaurant", emoji: "🍽" },
  { label: "Cafes", type: "cafe", emoji: "☕" },
  { label: "Attractions", type: "museum", emoji: "🏛" },
] as const;

const FALLBACK: Record<string, Omit<PlaceResult, "lat" | "lon">[]> = {
  restaurant: [
    { name: "Maison de Verre", distance: 180, cuisine: "French bistro" },
    { name: "Sora Ramen", distance: 220, cuisine: "Japanese" },
    { name: "Casa Maria", distance: 350, cuisine: "Italian" },
    { name: "Le Petit Comptoir", distance: 420, cuisine: "Wine bar" },
    { name: "Atelier Loaf", distance: 510, cuisine: "Bakery" },
  ],
  cafe: [
    { name: "Brew Society", distance: 140, cuisine: "Specialty coffee" },
    { name: "The Quiet Corner", distance: 260, cuisine: "Third-wave espresso" },
    { name: "Madeleine & Co", distance: 380, cuisine: "Patisserie" },
    { name: "Noon Coffee", distance: 490, cuisine: "Cold brew" },
  ],
  museum: [
    { name: "Heritage Museum", distance: 300 },
    { name: "Old City Gate", distance: 440 },
    { name: "Botanical Park", distance: 560 },
    { name: "The Conservatory", distance: 780 },
  ],
};

interface NearbyMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

type LeafletMap = {
  map: import("leaflet").Map;
  L: typeof import("leaflet");
};

export default function NearbyMap({ latitude, longitude, name }: NearbyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletMap | null>(null);
  const placeMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [places, setPlaces] = useState<DisplayPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Initialize Leaflet map once ──────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || leafletRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix webpack bundler breaking Leaflet's default icon URLs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      // CartoDB light tiles — clean, warm, no API key required
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Home pin — dark filled circle
      const homeIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#0E1110;border:3px solid #F2EBDB;border-radius:50%;box-shadow:0 2px 6px rgba(14,17,16,0.35);"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([latitude, longitude], { icon: homeIcon })
        .addTo(map)
        .bindPopup(`<b>${name}</b>`);

      leafletRef.current = { map, L };
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, [latitude, longitude, name]);

  // ── Fetch nearby places when tab changes ────────────────────────────────
  useEffect(() => {
    const cat = CATEGORIES[activeTab];
    setLoading(true);
    setUsingFallback(false);

    fetch(
      `${API_BASE}/api/nearby?lat=${latitude}&lon=${longitude}&type=${cat.type}&radius=800&limit=8`
    )
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: { places: PlaceResult[] }) => {
        const list = data.places ?? [];
        if (list.length === 0) throw new Error("empty");
        setPlaces(
          list.map((p) => ({ ...p, category: cat.label, emoji: cat.emoji }))
        );
      })
      .catch(() => {
        setUsingFallback(true);
        setPlaces(
          (FALLBACK[cat.type] ?? []).map((p) => ({
            ...p,
            lat: 0,
            lon: 0,
            category: cat.label,
            emoji: cat.emoji,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [activeTab, latitude, longitude]);

  // ── Sync place markers whenever places or mapReady changes ──────────────
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const { map, L } = leafletRef.current;

    // Remove old place markers
    placeMarkersRef.current.forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = [];

    const placeIcon = L.divIcon({
      html: `<div style="width:10px;height:10px;background:#C25A38;border:1.5px solid #0E1110;border-radius:50%;box-shadow:0 1px 4px rgba(194,90,56,0.45);"></div>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    places.forEach((place) => {
      if (!place.lat || !place.lon) return;
      const marker = L.marker([place.lat, place.lon], { icon: placeIcon })
        .addTo(map)
        .bindPopup(
          `<b>${place.name}</b><br><span style="font-size:11px;color:#666">${place.distance}m away</span>`
        );
      placeMarkersRef.current.push(marker);
    });
  }, [places, mapReady]);

  // ── Pan map to a place when clicked in the list ─────────────────────────
  function panToPlace(place: DisplayPlace) {
    if (!leafletRef.current || !place.lat || !place.lon) return;
    const { map } = leafletRef.current;
    map.setView([place.lat, place.lon], 17, { animate: true });
    const idx = places.indexOf(place);
    if (idx !== -1 && placeMarkersRef.current[idx]) {
      placeMarkersRef.current[idx].openPopup();
    }
  }

  return (
    <div className="rounded-sm border border-[var(--ink)] bg-[var(--ivory)] overflow-hidden">
      {/* Category Tabs */}
      <div className="flex border-b border-[var(--ink)] bg-[var(--paper)]">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-3.5 text-xs font-medium tracking-wide transition-colors relative font-mono uppercase tracking-[0.2em] ${
              activeTab === i
                ? "text-[var(--paper)] bg-[var(--ink)]"
                : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
            }`}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leaflet map */}
      <div className="relative h-72 w-full">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        {usingFallback && (
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--paper)] font-mono text-[9px] tracking-[0.2em] uppercase pointer-events-none">
            Sample data
          </div>
        )}
      </div>

      {/* Place list */}
      <div className="px-5 py-3 border-t border-[var(--ink)]">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--ink-muted)]">
            {places.length} nearby · 800m radius
          </p>
          {usingFallback && (
            <p className="font-mono text-[9px] text-[var(--ink-faint)] uppercase tracking-wider">
              Sample — backend offline?
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-6"
            >
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
            </motion.div>
          ) : places.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--ink-muted)] text-center py-6"
            >
              No {CATEGORIES[activeTab].label.toLowerCase()} found nearby
            </motion.p>
          ) : (
            <motion.div
              key={`places-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-[var(--border)]"
            >
              {places.map((place, i) => (
                <motion.button
                  key={place.name + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => panToPlace(place)}
                  className="w-full py-2.5 flex items-start gap-3 text-left hover:bg-[var(--paper-soft)] -mx-1 px-1 rounded transition-colors"
                >
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] mt-1 w-6 tracking-wider shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {place.name}
                    </p>
                    {place.cuisine && (
                      <p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                        {place.cuisine}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--terra)] whitespace-nowrap mt-0.5 font-mono shrink-0">
                    {place.distance}m
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
