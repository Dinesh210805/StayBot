"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Index" },
  { href: "/destinations", label: "Destinations" },
  { href: "/explore", label: "Stays" },
  { href: "/booking", label: "Booking" },
  { href: "/chat", label: "Concierge" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] transition-all duration-500",
          scrolled
            ? "bg-[#F2EBDB]/92 backdrop-blur-xl border-b border-[var(--border)] py-3 shadow-[0_2px_30px_-15px_rgba(14,17,16,0.15)]"
            : "bg-[#F2EBDB] py-5"
        )}
        style={{ backgroundColor: scrolled ? "rgba(242, 235, 219, 0.92)" : "#F2EBDB" }}
      >
        <div className="max-w-[1500px] mx-auto px-6 md:px-10 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-3 group">
            <span className="font-display text-2xl tracking-tight leading-none text-[var(--ink)]">
              Stay<em className="italic-display">Bot</em>
            </span>
            <span className="hidden md:inline font-mono text-[10px] tracking-[0.32em] text-[var(--ink-muted)] uppercase">
              N° 001 · Vol. I
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-full text-[13px] tracking-wide transition-colors duration-200 relative",
                    active ? "text-[var(--paper)]" : "text-[var(--ink)] hover:text-[var(--ink-soft)]"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-[var(--ink)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/chat"
            className="hidden md:inline-flex items-center gap-2 pl-5 pr-1.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-medium hover:bg-[var(--ink-soft)] transition-all duration-300"
          >
            Begin
            <span className="w-7 h-7 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center text-xs">
              →
            </span>
          </Link>

          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 8 : 0 }} className="block w-6 h-px bg-[var(--ink)]" />
            <motion.span animate={{ opacity: menuOpen ? 0 : 1 }} className="block w-6 h-px bg-[var(--ink)]" />
            <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -8 : 0 }} className="block w-6 h-px bg-[var(--ink)]" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-[var(--paper)]/97 backdrop-blur-xl pt-24 pb-8 px-8 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block py-4 font-display text-4xl border-b border-[var(--border)]",
                      pathname === link.href ? "italic text-[var(--terra)]" : "text-[var(--ink)]"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link
                  href="/chat"
                  onClick={() => setMenuOpen(false)}
                  className="mt-8 inline-flex items-center justify-center px-7 py-4 rounded-full text-base font-medium bg-[var(--ink)] text-[var(--paper)]"
                >
                  Begin a conversation →
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
