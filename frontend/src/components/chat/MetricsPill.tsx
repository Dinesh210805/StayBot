"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type MetricsSummary } from "@/lib/api";

function latencyColor(ms: number) {
  if (ms < 300) return "var(--forest)";
  if (ms < 800) return "var(--ochre)";
  return "var(--terra)";
}

function LatencyBar({ label, ms, max }: { label: string; ms: number; max: number }) {
  const pct = max > 0 ? Math.min((ms / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)] w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--ink)]/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: latencyColor(ms) }}
        />
      </div>
      <span className="font-mono text-[10px] text-[var(--ink)] w-12 text-right shrink-0">{Math.round(ms)}ms</span>
    </div>
  );
}

function SkeletonLine({ w = "full" }: { w?: string }) {
  return <div className={`h-2.5 w-${w} rounded bg-[var(--ink)]/8 animate-pulse`} />;
}

export default function MetricsPill() {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = async () => {
    try {
      const data = await api.metrics.get();
      setMetrics(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setLoading(true);
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const noData = false;
  const isEmpty = metrics && metrics.overview.total_requests === 0;

  const topTools = metrics
    ? Object.entries(metrics.tool_usage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];
  const maxTool = topTools[0]?.[1] ?? 1;

  const maxLatency = metrics ? Math.max(metrics.latency_ms.p99, 1000) : 1000;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="metrics-drawer"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-72 bg-[var(--ink)] text-[var(--paper)] rounded-sm border border-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--paper)]/10 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Live Telemetry</p>
                <p className="font-display text-sm italic-display mt-0.5">Backend Metrics</p>
              </div>
              {metrics && !error && (
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--forest)] animate-pulse" />
                  Live
                </span>
              )}
            </div>

            <div className="px-4 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
              {error ? (
                <div className="text-center py-4">
                  <p className="text-[13px] opacity-60 mb-1">Could not reach metrics</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                    Set NEXT_PUBLIC_METRICS_TOKEN in .env
                  </p>
                </div>
              ) : loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <SkeletonLine w="24" />
                      <SkeletonLine />
                      <SkeletonLine w="3/4" />
                    </div>
                  ))}
                </div>
              ) : isEmpty ? (
                <div className="text-center py-4">
                  <p className="text-[13px] opacity-60">No data yet</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest opacity-40 mt-1">
                    Start a conversation first
                  </p>
                </div>
              ) : noData ? null : metrics ? (
                <>
                  {/* Overview */}
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2">Overview</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[var(--paper)]/8 rounded px-3 py-2">
                        <p className="font-mono text-[10px] opacity-50 mb-0.5">Requests</p>
                        <p className="font-display text-xl">{metrics.overview.total_requests}</p>
                      </div>
                      <div className="bg-[var(--paper)]/8 rounded px-3 py-2">
                        <p className="font-mono text-[10px] opacity-50 mb-0.5">Error rate</p>
                        <p className="font-display text-xl" style={{ color: metrics.overview.error_rate > 0.05 ? "var(--terra)" : "inherit" }}>
                          {(metrics.overview.error_rate * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Latency */}
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2.5">Latency</p>
                    <div className="space-y-2">
                      <LatencyBar label="p50" ms={metrics.latency_ms.p50} max={maxLatency} />
                      <LatencyBar label="p95" ms={metrics.latency_ms.p95} max={maxLatency} />
                      <LatencyBar label="p99" ms={metrics.latency_ms.p99} max={maxLatency} />
                    </div>
                    <p className="font-mono text-[9px] opacity-40 mt-2">avg {Math.round(metrics.latency_ms.avg)}ms</p>
                  </div>

                  {/* RAG */}
                  {metrics.rag.avg_relevance > 0 && (
                    <div>
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2">RAG Relevance</p>
                      <div className="flex items-end gap-2">
                        <span className="font-display text-3xl" style={{ color: metrics.rag.avg_relevance > 0.7 ? "var(--forest)" : metrics.rag.avg_relevance > 0.5 ? "var(--ochre)" : "var(--terra)" }}>
                          {(metrics.rag.avg_relevance * 100).toFixed(0)}
                        </span>
                        <span className="font-mono text-[10px] opacity-50 pb-1">/ 100 avg score</span>
                      </div>
                      <p className="font-mono text-[9px] opacity-40 mt-1">
                        min {(metrics.rag.min_relevance * 100).toFixed(0)} · max {(metrics.rag.max_relevance * 100).toFixed(0)}
                      </p>
                      <p className="font-mono text-[9px] opacity-40">
                        embed {Math.round(metrics.rag.embedding_latency_ms)}ms · retrieve {Math.round(metrics.rag.retrieval_latency_ms)}ms
                      </p>
                    </div>
                  )}

                  {/* Tokens */}
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2">Tokens / request</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="font-mono text-[9px] opacity-40">Input</p>
                        <p className="font-display text-lg">{Math.round(metrics.tokens.avg_input_per_req)}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] opacity-40">Output</p>
                        <p className="font-display text-lg">{Math.round(metrics.tokens.avg_output_per_req)}</p>
                      </div>
                    </div>
                    <p className="font-mono text-[9px] opacity-40 mt-1">
                      total {(metrics.tokens.total_input + metrics.tokens.total_output).toLocaleString()} tokens
                    </p>
                  </div>

                  {/* Tool usage */}
                  {topTools.length > 0 && (
                    <div>
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2.5">Tool calls</p>
                      <div className="space-y-2">
                        {topTools.map(([name, count]) => (
                          <div key={name} className="flex items-center gap-2">
                            <span className="font-mono text-[9px] opacity-60 w-24 truncate shrink-0">{name.replace("_tool", "")}</span>
                            <div className="flex-1 h-1.5 bg-[var(--paper)]/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / maxTool) * 100}%` }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full bg-[var(--ochre)]"
                              />
                            </div>
                            <span className="font-mono text-[10px] opacity-60 w-6 text-right shrink-0">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="px-4 py-2.5 border-t border-[var(--paper)]/10">
              <p className="font-mono text-[8px] tracking-widest uppercase opacity-30">
                Refreshes every 15s · Real backend data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill button */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ink)] text-[var(--paper)] rounded-full font-mono text-[10px] tracking-[0.2em] uppercase shadow-[2px_2px_0_0_var(--ink-muted)] hover:shadow-[3px_3px_0_0_var(--ink-muted)] transition-shadow"
      >
        <span>⚡</span>
        Dev
        {open && <span className="opacity-50 ml-0.5">×</span>}
      </motion.button>
    </div>
  );
}
