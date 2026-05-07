"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import type { Destination } from "@/lib/destinations";

interface FilmStripProps {
  destinations: Destination[];
}

export default function FilmStrip({ destinations }: FilmStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-12%"]);

  const frames = destinations.flatMap((d, di) =>
    d.gallery.map((url, gi) => ({
      url,
      city: d.name,
      accentHex: d.accent,
      coordinate: d.coordinate,
      key: `${di}-${gi}`,
      index: di * d.gallery.length + gi,
    }))
  );

  return (
    <div
      ref={ref}
      className="relative overflow-hidden border-y border-[var(--ink)] bg-[var(--ink)] py-10 md:py-14"
    >
      <div className="absolute top-5 left-6 font-mono text-[9px] tracking-[0.38em] uppercase text-white/30 z-10">
        Field Notes · Vol. I
      </div>

      <motion.div
        style={{ x }}
        className="flex gap-2.5"
        drag="x"
        dragConstraints={{ left: -600, right: 0 }}
        dragElastic={0.1}
      >
        {frames.map((frame) => (
          <div
            key={frame.key}
            className="relative flex-shrink-0 overflow-hidden"
            style={{
              width: frame.index % 3 === 0 ? "340px" : "260px",
              height: frame.index % 3 === 0 ? "420px" : "320px",
            }}
          >
            <Image
              src={frame.url}
              alt={frame.city}
              fill
              className="object-cover transition-transform duration-700 hover:scale-105"
              sizes="340px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/60 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <span
                className="font-mono text-[9px] tracking-[0.35em] uppercase"
                style={{ color: frame.accentHex }}
              >
                {frame.city}
              </span>
              <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-white/40">
                {String(frame.index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="absolute top-3 left-3 font-mono text-[8px] tracking-[0.3em] uppercase text-white/30">
              {frame.coordinate.split("·")[0].trim()}
            </div>
          </div>
        ))}

        {/* Duplicate for visual continuation */}
        {frames.slice(0, 4).map((frame) => (
          <div
            key={`d-${frame.key}`}
            className="relative flex-shrink-0 overflow-hidden"
            style={{ width: "260px", height: "320px" }}
          >
            <Image
              src={frame.url}
              alt={frame.city}
              fill
              className="object-cover"
              sizes="260px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span
                className="font-mono text-[9px] tracking-[0.35em] uppercase"
                style={{ color: frame.accentHex }}
              >
                {frame.city}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="absolute bottom-5 right-6 font-mono text-[9px] tracking-[0.38em] uppercase text-white/25 z-10">
        Drag to browse ·
      </div>
    </div>
  );
}
