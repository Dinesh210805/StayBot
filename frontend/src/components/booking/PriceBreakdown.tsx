"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import type { DateRange } from "./CalendarPicker";

interface PriceBreakdownProps {
  pricePerNight: number;
  dateRange: DateRange;
  cleaningFee?: number;
  serviceFee?: number;
}

export default function PriceBreakdown({
  pricePerNight,
  dateRange,
  cleaningFee = 0,
  serviceFee = 0,
}: PriceBreakdownProps) {
  const base = pricePerNight * dateRange.nights;
  const total = base + cleaningFee + serviceFee;

  const rows = [
    {
      label: `${formatPrice(pricePerNight)} × ${dateRange.nights} night${dateRange.nights > 1 ? "s" : ""}`,
      amount: base,
    },
    ...(cleaningFee > 0 ? [{ label: "Cleaning fee", amount: cleaningFee }] : []),
    ...(serviceFee > 0 ? [{ label: "Service fee", amount: serviceFee }] : []),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="pt-4 mt-4 border-t border-[var(--border)] space-y-2.5">
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex justify-between text-sm"
            >
              <span className="text-[var(--text-secondary)]">{row.label}</span>
              <span className="text-[var(--text-primary)]">{formatPrice(row.amount)}</span>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rows.length * 0.05 + 0.1 }}
            className="flex justify-between text-sm font-semibold pt-3 border-t border-[var(--border)]"
          >
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="text-[var(--gold)]">{formatPrice(total)}</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
