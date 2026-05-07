"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Place {
  name: string;
  vicinity: string;
  rating?: number;
  category: string;
  emoji: string;
}

interface Category {
  label: string;
  type: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { label: "Restaurants", type: "restaurant", emoji: "🍽" },
  { label: "Transit", type: "transit_station", emoji: "🚇" },
  { label: "Attractions", type: "tourist_attraction", emoji: "🏛" },
];

const FALLBACK_PLACES: Record<string, Omit<Place, "category" | "emoji">[]> = {
  restaurant: [
    { name: "Maison de Verre", vicinity: "180 m · charming bistro", rating: 4.7 },
    { name: "Sora Ramen", vicinity: "220 m · counter-style noodles", rating: 4.6 },
    { name: "Casa Maria", vicinity: "350 m · slow Italian", rating: 4.5 },
    { name: "Le Petit Comptoir", vicinity: "420 m · wine + small plates", rating: 4.8 },
    { name: "Atelier Loaf", vicinity: "510 m · sourdough bakery", rating: 4.4 },
  ],
  transit_station: [
    { name: "Riverside Station", vicinity: "260 m · 3 lines", rating: undefined },
    { name: "Old Town Square", vicinity: "390 m · tram interchange", rating: undefined },
    { name: "North Pier", vicinity: "650 m · ferry terminal", rating: undefined },
  ],
  tourist_attraction: [
    { name: "Heritage Museum", vicinity: "300 m · permanent collection", rating: 4.7 },
    { name: "Old City Gate", vicinity: "440 m · 14th-century arch", rating: 4.6 },
    { name: "Botanical Park", vicinity: "560 m · open till sunset", rating: 4.8 },
    { name: "The Conservatory", vicinity: "780 m · concert hall", rating: 4.5 },
  ],
};

interface NearbyMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export default function NearbyMap({ latitude, longitude, name }: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps if key present
  useEffect(() => {
    if (!apiKey) {
      setUsingFallback(true);
      return;
    }
    if (!mapRef.current) return;

    let cancelled = false;
    async function init() {
      try {
        const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
        setOptions({ key: apiKey!, v: "weekly" });
        const { Map, Marker, SymbolPath, ControlPosition } = (await importLibrary("maps")) as typeof google.maps;
        await importLibrary("places");
        if (cancelled || !mapRef.current) return;

        const center = { lat: latitude, lng: longitude };
        const map = new Map(mapRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: ControlPosition.RIGHT_CENTER },
          styles: [
            { elementType: "geometry", stylers: [{ color: "#F2EBDB" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#F2EBDB" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#5C5650" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#FBF6EA" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#DACFB7" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#D8E4DA" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ECE3CF" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#ECE3CF" }] },
          ],
        });

        new Marker({
          position: center,
          map,
          icon: {
            path: SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#0E1110",
            fillOpacity: 1,
            strokeColor: "#F2EBDB",
            strokeWeight: 3,
          },
          title: name,
        });

        mapInstanceRef.current = map;
        setReady(true);
      } catch {
        setUsingFallback(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [apiKey, latitude, longitude, name]);

  // Fetch places
  useEffect(() => {
    if (usingFallback) {
      const cat = CATEGORIES[activeTab];
      setPlaces(
        FALLBACK_PLACES[cat.type].map((p) => ({
          ...p,
          category: cat.label,
          emoji: cat.emoji,
        }))
      );
      return;
    }
    if (!ready || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    setPlaces([]);
    setLoading(true);

    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(
      { location: { lat: latitude, lng: longitude }, radius: 800, type: CATEGORIES[activeTab].type },
      (results, status) => {
        setLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;

        const top = results.slice(0, 6);
        setPlaces(
          top.map((p) => ({
            name: p.name ?? "",
            vicinity: p.vicinity ?? "",
            rating: p.rating,
            category: CATEGORIES[activeTab].label,
            emoji: CATEGORIES[activeTab].emoji,
          }))
        );
        top.forEach((place) => {
          if (!place.geometry?.location) return;
          markersRef.current.push(
            new google.maps.Marker({
              position: place.geometry.location,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#C25A38",
                fillOpacity: 0.9,
                strokeColor: "#0E1110",
                strokeWeight: 1.5,
              },
              title: place.name,
            })
          );
        });
      }
    );
  }, [ready, activeTab, latitude, longitude, usingFallback]);

  return (
    <div className="rounded-sm border border-[var(--ink)] bg-[var(--ivory)] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--ink)] bg-[var(--paper)]">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-3.5 text-xs font-medium tracking-wide transition-colors relative font-mono uppercase tracking-[0.2em] ${
              activeTab === i ? "text-[var(--paper)] bg-[var(--ink)]" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
            }`}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div className="relative h-72 w-full bg-[var(--paper-soft)]">
        {usingFallback ? (
          <StaticMapFallback latitude={latitude} longitude={longitude} name={name} places={places.length} />
        ) : (
          <div ref={mapRef} className="absolute inset-0" />
        )}
        {usingFallback && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--paper)] font-mono text-[9px] tracking-[0.2em] uppercase">
            Sample view
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
              Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for live data
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
              No nearby {CATEGORIES[activeTab].label.toLowerCase()} found
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
                <motion.div
                  key={place.name + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="py-2.5 flex items-start gap-3"
                >
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] mt-1 w-6 tracking-wider">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{place.name}</p>
                    {place.vicinity && (
                      <p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">{place.vicinity}</p>
                    )}
                  </div>
                  {place.rating != null && (
                    <span className="text-[11px] text-[var(--terra)] whitespace-nowrap mt-0.5 font-mono">
                      ★ {place.rating.toFixed(1)}
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Static SVG fallback map (when no API key) ───────────────────────────
function StaticMapFallback({ name, places }: { latitude: number; longitude: number; name: string; places: number }) {
  return (
    <svg viewBox="0 0 800 320" className="absolute inset-0 w-full h-full">
      {/* Background */}
      <rect width="800" height="320" fill="#F2EBDB" />

      {/* Grid */}
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0E1110" strokeWidth="0.5" opacity="0.06" />
        </pattern>
      </defs>
      <rect width="800" height="320" fill="url(#map-grid)" />

      {/* Roads (radial pattern) */}
      <g stroke="#DACFB7" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M 0 160 L 800 160" />
        <path d="M 400 0 L 400 320" />
        <path d="M 80 60 Q 400 160 720 80" />
        <path d="M 100 280 Q 400 200 700 260" />
        <path d="M 0 80 L 800 240" opacity="0.6" />
      </g>
      <g stroke="#FBF6EA" strokeWidth="1" fill="none" strokeLinecap="round">
        <path d="M 0 160 L 800 160" />
        <path d="M 400 0 L 400 320" />
      </g>

      {/* Park/water blobs */}
      <ellipse cx="200" cy="220" rx="80" ry="40" fill="#D8E4DA" opacity="0.7" />
      <ellipse cx="620" cy="80" rx="100" ry="50" fill="#E0DBC4" opacity="0.7" />

      {/* Subtle blocks */}
      {[
        [120, 100, 60, 40], [220, 60, 50, 50], [320, 90, 40, 30],
        [480, 120, 70, 50], [580, 90, 40, 40], [680, 200, 55, 45],
        [120, 220, 50, 30], [320, 220, 60, 50], [560, 240, 70, 50],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#ECE3CF" stroke="#DACFB7" strokeWidth="0.5" rx="2" />
      ))}

      {/* Nearby place pins (decorative) */}
      {Array.from({ length: Math.min(places, 6) }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 90 + (i % 2) * 30;
        const x = 400 + Math.cos(angle) * r;
        const y = 160 + Math.sin(angle) * r * 0.7;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="#C25A38" stroke="#0E1110" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="14" fill="#C25A38" opacity="0.15" className="drift" />
          </g>
        );
      })}

      {/* Center pin (the property) */}
      <g>
        <circle cx="400" cy="160" r="22" fill="#0E1110" opacity="0.10" />
        <circle cx="400" cy="160" r="14" fill="#0E1110" opacity="0.18" />
        <circle cx="400" cy="160" r="9" fill="#0E1110" stroke="#F2EBDB" strokeWidth="2" />
      </g>

      {/* Label */}
      <g>
        <rect x="320" y="180" width="160" height="22" rx="4" fill="#0E1110" />
        <text x="400" y="195" textAnchor="middle" fill="#F2EBDB" fontFamily="monospace" fontSize="10" letterSpacing="2">
          {name.slice(0, 22).toUpperCase()}
        </text>
      </g>

      {/* Compass */}
      <g transform="translate(750, 40)">
        <circle r="18" fill="#FBF6EA" stroke="#0E1110" strokeWidth="1" />
        <text textAnchor="middle" y="-6" fontFamily="monospace" fontSize="8" fill="#0E1110" letterSpacing="1">N</text>
        <line x1="0" y1="-12" x2="0" y2="12" stroke="#0E1110" strokeWidth="0.5" />
        <line x1="-12" y1="0" x2="12" y2="0" stroke="#0E1110" strokeWidth="0.5" />
        <polygon points="0,-12 -3,-2 0,-6 3,-2" fill="#C25A38" />
      </g>
    </svg>
  );
}
