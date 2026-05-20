"use client";

import Link from "next/link";
import ChatPreview from "@/components/home/ChatPreview";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Reveal, RevealLines } from "@/components/fx/Reveal";

/**
 * "The Conversation" — Concierge preview section.
 *
 * Wraps <ChatPreview/> in a scroll-driven clip-path inset reveal so the
 * widget opens from a tight polygon to full bleed as the section enters
 * the viewport.
 */
export default function ConciergeFrame() {
  return (
    <section className="relative bg-[var(--paper)] py-32 md:py-44 px-6 md:px-12 overflow-visible">
      <div className="absolute inset-0 grid-lines opacity-[0.05] pointer-events-none" />

      <div className="relative max-w-[1500px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4">
            <Reveal>
              <p className="eyebrow-muted mb-6">/04 · The Conversation</p>
            </Reveal>
            <RevealLines
              as="h2"
              className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.025em] mb-8"
              lines={[
                <span key="1">Speak in plain</span>,
                <span key="2">language. We answer</span>,
                <span key="3">
                  in <em className="italic-display text-[var(--terra)]">places</em>.
                </span>,
              ]}
            />
            <Reveal delay={0.15}>
              <p className="text-[var(--ink-soft)] text-lg leading-relaxed mb-10 max-w-md pretty">
                No filters. No checkboxes. Tell the concierge exactly what you
                want — a balcony, a Tuesday, walking distance to bread — and
                you&apos;ll get places, not pages of results.
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <Link
                href="/chat"
                className="group inline-flex items-center gap-2 pl-7 pr-1.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--ink-soft)] transition-all"
              >
                Open the conversation
                <span className="w-9 h-9 rounded-full bg-[var(--ochre)] text-[var(--ink)] flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-300">
                  →
                </span>
              </Link>
            </Reveal>
          </div>

          <div className="lg:col-span-8 overflow-visible px-1 md:px-3">
            <ContainerScroll
              titleComponent={<></>}
              variant="embedded"
              className="h-auto min-h-0"
              cardClassName="max-w-none"
              contentClassName="bg-[var(--ivory)]"
            >
              <ChatPreview />
            </ContainerScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
