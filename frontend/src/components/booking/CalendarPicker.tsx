"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRange {
  from: Date;
  to: Date;
  nights: number;
}

interface CalendarPickerProps {
  minNights?: number;
  onRangeChange: (range: DateRange | null) => void;
  variant?: "compact" | "wide";
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= count; d++) days.push(new Date(year, month, d));
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isPast(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date < today;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
function formatShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CalendarPicker({ minNights = 1, onRangeChange, variant = "compact" }: CalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);

  const monthsToShow = variant === "wide" ? 2 : 1;
  const monthsData = useMemo(() => {
    return Array.from({ length: monthsToShow }, (_, i) => {
      const m = (viewMonth + i) % 12;
      const y = viewYear + Math.floor((viewMonth + i) / 12);
      return { year: y, month: m, days: getDaysInMonth(y, m) };
    });
  }, [viewYear, viewMonth, monthsToShow]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(date: Date) {
    if (isPast(date)) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null); onRangeChange(null);
      return;
    }
    if (date <= startDate) {
      setStartDate(date); setEndDate(null); onRangeChange(null);
      return;
    }
    const nights = diffDays(startDate, date);
    if (nights < minNights) return;
    setEndDate(date);
    onRangeChange({ from: startDate, to: date, nights });
  }

  function clearRange() {
    setStartDate(null); setEndDate(null); setHover(null); onRangeChange(null);
  }

  const previewEnd = endDate ?? (startDate ? hover : null);

  type DayState = "empty" | "past" | "start" | "end" | "range" | "hover-valid" | "hover-invalid" | "default";

  function getDayState(date: Date | null): DayState {
    if (!date) return "empty";
    if (isPast(date)) return "past";
    if (!startDate) return "default";
    if (isSameDay(date, startDate)) return "start";
    if (endDate) {
      if (isSameDay(date, endDate)) return "end";
      if (date > startDate && date < endDate) return "range";
      return "default";
    }
    if (hover) {
      if (isSameDay(date, hover) && date > startDate) {
        return diffDays(startDate, hover) >= minNights ? "hover-valid" : "hover-invalid";
      }
      if (date > startDate && date < hover && previewEnd && diffDays(startDate, previewEnd) >= minNights) {
        return "range";
      }
    }
    return "default";
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="font-mono text-[11px] tracking-[0.32em] uppercase text-[var(--ink-muted)]">
          Pick check-in & check-out
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Months row */}
      <div className={`grid ${monthsToShow === 2 ? "md:grid-cols-2" : "grid-cols-1"} gap-8`}>
        {monthsData.map(({ year, month, days }, mi) => (
          <div key={`${year}-${month}`}>
            <div className="text-center mb-4">
              <p className="font-display text-2xl tracking-tight">
                {MONTHS[month]} <span className="text-[var(--ink-muted)] font-mono text-sm">{year}</span>
              </p>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[9px] tracking-[0.25em] uppercase text-[var(--ink-muted)] py-1 font-mono">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {days.map((date, i) => {
                const state = getDayState(date);
                if (state === "empty" || !date) return <div key={`e-${mi}-${i}`} />;

                const isStart = state === "start";
                const isEnd = state === "end";
                const isRange = state === "range";
                const isPastDay = state === "past";
                const isHoverValid = state === "hover-valid";
                const isHoverInvalid = state === "hover-invalid";
                const isSelected = isStart || isEnd || isHoverValid;

                return (
                  <div
                    key={date.toISOString()}
                    className={`relative flex items-center justify-center h-10 ${
                      isRange ? "bg-[var(--paper-deep)]" : ""
                    } ${
                      isStart && (endDate || (hover && diffDays(startDate!, hover) >= minNights)) ? "rounded-l-full" : ""
                    } ${
                      (isEnd || isHoverValid) ? "rounded-r-full" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleDayClick(date)}
                      onMouseEnter={() => !endDate && startDate && setHover(date)}
                      onMouseLeave={() => setHover(null)}
                      disabled={isPastDay}
                      className={`
                        w-9 h-9 rounded-full text-sm transition-all duration-150 relative z-10 font-medium
                        ${isPastDay ? "text-[var(--ink-faint)] cursor-not-allowed" : ""}
                        ${isSelected ? "bg-[var(--ink)] text-[var(--paper)] shadow-[0_4px_12px_rgba(14,17,16,0.25)]" : ""}
                        ${isHoverInvalid ? "bg-[var(--terra)] text-white" : ""}
                        ${isRange ? "text-[var(--ink)] hover:bg-[var(--paper-deep)]" : ""}
                        ${!isPastDay && !isSelected && !isRange && !isHoverInvalid
                          ? "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
                          : ""}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <AnimatePresence mode="wait">
        {startDate && !endDate && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-center text-[11px] text-[var(--ink-muted)] mt-5 font-mono tracking-wider uppercase"
          >
            {hover && diffDays(startDate, hover) > 0 && diffDays(startDate, hover) < minNights
              ? `Minimum ${minNights} night${minNights > 1 ? "s" : ""}`
              : `Select check-out · min ${minNights} night${minNights > 1 ? "s" : ""}`}
          </motion.p>
        )}
        {startDate && endDate && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-center gap-4 bg-[var(--ink)] text-[var(--paper)] rounded-full px-5 py-3 text-sm"
          >
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Check-in</span>
            <span>{formatShort(startDate)}</span>
            <span className="text-[var(--ochre)] text-lg leading-none">→</span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Check-out</span>
            <span>{formatShort(endDate)}</span>
            <span className="ml-auto font-mono text-[10px] tracking-widest uppercase">
              {diffDays(startDate, endDate)} night{diffDays(startDate, endDate) !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearRange}
              className="text-[var(--paper)] hover:text-[var(--terra)] transition-colors"
              aria-label="Clear dates"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
