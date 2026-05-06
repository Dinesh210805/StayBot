"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/chat", label: "AI Concierge" },
];

export default function Navigation() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".nav-item", {
        y: -20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.3,
      });
      gsap.from(".nav-logo", {
        x: -30,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.1,
      });
    }, navRef);

    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      ctx.revert();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-[var(--bg-deep)]/90 backdrop-blur-xl border-b border-[var(--border)] py-3"
            : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="nav-logo flex items-center gap-2 group">
            <div className="w-8 h-8 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="absolute inset-[3px] rounded-full border border-[var(--gold)] flex items-center justify-center">
                <span className="text-[var(--gold)] text-xs font-bold">S</span>
              </div>
            </div>
            <span className="font-display text-xl text-[var(--text-primary)] tracking-wide">
              Stay<span className="text-[var(--gold)]">Bot</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "nav-item text-sm font-medium tracking-wide transition-colors duration-200 relative group",
                  pathname === link.href
                    ? "text-[var(--gold)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-px bg-[var(--gold)] transition-all duration-300",
                    pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            ))}
            <Link
              href="/chat"
              className="nav-item ml-4 px-5 py-2 rounded-full text-sm font-medium bg-[var(--gold)] text-[var(--bg-void)] hover:bg-[var(--gold-light)] transition-all duration-200 hover:shadow-[0_0_20px_rgba(201,169,110,0.4)]"
            >
              Start Planning
            </Link>
          </div>

          <button
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <motion.span
              animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 8 : 0 }}
              className="block w-6 h-px bg-[var(--text-primary)]"
            />
            <motion.span
              animate={{ opacity: menuOpen ? 0 : 1 }}
              className="block w-6 h-px bg-[var(--text-primary)]"
            />
            <motion.span
              animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -8 : 0 }}
              className="block w-6 h-px bg-[var(--text-primary)]"
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-0 z-40 bg-[var(--bg-deep)]/95 backdrop-blur-xl pt-20 pb-8 px-6 md:hidden border-b border-[var(--border)]"
          >
            <div className="flex flex-col gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "text-2xl font-display tracking-wide",
                    pathname === link.href
                      ? "text-[var(--gold)]"
                      : "text-[var(--text-primary)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/chat"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium bg-[var(--gold)] text-[var(--bg-void)]"
              >
                Start Planning
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
