"use client";

import { useRef, useState, useEffect } from "react";

interface VideoBackgroundProps {
  /** Direct MP4 URL or YouTube embed URL (https://www.youtube.com/embed/{id}?...) */
  src: string;
  /** Poster / fallback image URL — shown while video loads or on error */
  poster?: string;
  className?: string;
  overlayClassName?: string;
  /** 0–1, default 0.3 */
  overlayOpacity?: number;
}

function isYouTubeUrl(url: string) {
  return url.includes("youtube.com/embed/") || url.includes("youtu.be/");
}

export default function VideoBackground({
  src,
  poster,
  className = "",
  overlayClassName = "",
  overlayOpacity = 0.3,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const youtube = isYouTubeUrl(src);

  useEffect(() => {
    if (youtube) return;
    const el = videoRef.current;
    if (!el) return;
    const onCanPlay = () => setVideoLoaded(true);
    const onError = () => setVideoFailed(true);
    el.addEventListener("canplaythrough", onCanPlay);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("canplaythrough", onCanPlay);
      el.removeEventListener("error", onError);
    };
  }, [youtube]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Poster image — always underneath as fallback */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: youtube || videoLoaded ? 0 : 1,
            transition: "opacity 1s ease",
          }}
        />
      )}

      {/* YouTube iframe background */}
      {youtube && (
        <iframe
          src={src}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          title="background video"
          aria-hidden
          tabIndex={-1}
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            width: "calc(100% + 200px)",
            height: "calc(100% + 200px)",
            transform: "translate(-50%, -50%)",
            border: 0,
          }}
        />
      )}

      {/* Direct MP4 video */}
      {!youtube && !videoFailed && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: videoLoaded ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        />
      )}

      {/* Colour overlay */}
      <div
        aria-hidden
        className={`absolute inset-0 ${overlayClassName}`}
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
}
