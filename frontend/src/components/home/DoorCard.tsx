"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import ProgressiveBlur from "@/components/fx/ProgressiveBlur";

export interface DoorCardData {
  numeral: string;
  title: string;
  body: string;
  videoSrc?: string;
  poster?: string;
  accent: string;
  gradient: string;
}

interface DoorCardProps {
  data: DoorCardData;
  index: number;
  isLast?: boolean;
}

export default function DoorCard({ data, index, isLast }: DoorCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [videoFailed, setVideoFailed] = useState(false);

  const hasVideo = !videoFailed && !!data.videoSrc;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView]);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
      className={`group relative flex flex-col bg-[var(--ivory)] border-t border-[var(--ink)] ${
        isLast ? "" : "md:border-r"
      } overflow-hidden`}
    >
      {/* Accent top strip */}
      <div className="h-[3px] w-full" style={{ background: data.accent }} />

      {/* Video — only rendered when a source is provided */}
      {hasVideo && (
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--ink)]">
          <video
            ref={videoRef}
            src={data.videoSrc}
            poster={data.poster}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
          />
          <ProgressiveBlur
            direction="bottom"
            layers={5}
            intensity={0.4}
            className="h-2/5 top-auto bottom-0"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 px-8 md:px-10 pt-10 pb-12 overflow-hidden">
        {/* Ghost numeral — decorative, behind content */}
        <span
          className="absolute -right-4 -bottom-6 font-display italic-display text-[10rem] md:text-[12rem] leading-none select-none pointer-events-none"
          style={{ color: data.accent, opacity: 0.08 }}
          aria-hidden
        >
          {data.numeral}
        </span>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <span
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] tracking-[0.2em] shrink-0"
            style={{ borderColor: data.accent, color: data.accent }}
          >
            {data.numeral}
          </span>
          <span className="h-px flex-1 max-w-[3rem]" style={{ background: data.accent, opacity: 0.4 }} />
        </div>

        <h3 className="font-display text-2xl md:text-[1.75rem] leading-[1.05] tracking-[-0.02em] text-[var(--ink)] mb-5">
          {data.title}
        </h3>
        <p className="text-[var(--ink-soft)] leading-relaxed pretty max-w-xs text-[0.9375rem]">
          {data.body}
        </p>
      </div>
    </motion.article>
  );
}
