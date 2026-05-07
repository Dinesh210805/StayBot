"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0, raf = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (hidden) setHidden(false);
    };
    const out = () => setHidden(true);
    const overInteractive = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      const interactive = t.closest("a, button, [role='button'], input, textarea, [data-cursor-grow]");
      setHovering(!!interactive);
    };

    const tick = () => {
      dx += (mx - dx) * 0.65;
      dy += (my - dy) * 0.65;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mousemove", overInteractive);
    window.addEventListener("mouseleave", out);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousemove", overInteractive);
      window.removeEventListener("mouseleave", out);
      cancelAnimationFrame(raf);
    };
  }, [hidden]);

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] hidden md:block"
        style={{
          width: hovering ? 8 : 5,
          height: hovering ? 8 : 5,
          borderRadius: "50%",
          background: "var(--ink)",
          opacity: hidden ? 0 : 1,
          transition: "width 200ms, height 200ms, opacity 200ms",
        }}
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] hidden md:block"
        style={{
          width: hovering ? 60 : 30,
          height: hovering ? 60 : 30,
          borderRadius: "50%",
          border: `1px solid var(--ink)`,
          background: hovering ? "rgba(14,17,16,0.05)" : "transparent",
          opacity: hidden ? 0 : (hovering ? 1 : 0.6),
          transition: "width 220ms cubic-bezier(0.16,1,0.3,1), height 220ms cubic-bezier(0.16,1,0.3,1), background 220ms, opacity 200ms",
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
