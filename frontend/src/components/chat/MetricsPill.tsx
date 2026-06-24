"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type MetricsSummary, type EvalSummary } from "@/lib/api";

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
  const [evalData, setEvalData] = useState<EvalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = async () => {
    // Runtime metrics are auth-gated and the source of truth for "Live" status;
    // eval scores are best-effort and must never break the runtime view.
    const [metricsRes, evalRes] = await Promise.allSettled([
      api.metrics.get(),
      api.eval.get(),
    ]);

    if (metricsRes.status === "fulfilled") {
      setMetrics(metricsRes.value);
      setError(false);
    } else {
      setError(true);
    }

    if (evalRes.status === "fulfilled") setEvalData(evalRes.value);

    setLoading(false);
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

  // Empty state: backend returns only { total_requests: 0, note, model } with
  // none of the analytic blocks, so detect it from either signal.
  const isEmpty = Boolean(
    metrics && (metrics.total_requests === 0 || metrics.overview?.total_requests === 0)
  );
  const hasMetrics = Boolean(metrics?.overview);

  const topTools = metrics?.tool_usage
    ? Object.entries(metrics.tool_usage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];
  const maxTool = topTools[0]?.[1] ?? 1;

  const maxLatency = metrics?.latency_ms ? Math.max(metrics.latency_ms.p99, 1000) : 1000;

  const ragRelevance = metrics?.rag?.relevance_score.avg ?? 0;
  const hasEval = Boolean(evalData?.available);

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
                    Set NEXT_PUBLIC_METRICS_TOKEN in frontend/.env.local
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
              ) : (
                <>
                  {isEmpty ? (
                    <div className="text-center py-4">
                      <p className="text-[13px] opacity-60">No live data yet</p>
                      <p className="font-mono text-[9px] uppercase tracking-widest opacity-40 mt-1">
                        Start a conversation first
                      </p>
                    </div>
                  ) : hasMetrics && metrics ? (
                    <>
                      {/* Overview */}
                      <div>
                        <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2">Overview</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[var(--paper)]/8 rounded px-3 py-2">
                            <p className="font-mono text-[10px] opacity-50 mb-0.5">Requests</p>
                            <p className="font-display text-xl">{metrics.overview?.total_requests ?? 0}</p>
                          </div>
                          <div className="bg-[var(--paper)]/8 rounded px-3 py-2">
                            <p className="font-mono text-[10px] opacity-50 mb-0.5">Error rate</p>
                            <p className="font-display text-xl" style={{ color: (metrics.overview?.error_rate_pct ?? 0) > 5 ? "var(--terra)" : "inherit" }}>
                              {(metrics.overview?.error_rate_pct ?? 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Latency */}
                      {metrics.latency_ms && (
                        <div>
                          <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2.5">Latency</p>
                          <div className="space-y-2">
                            <LatencyBar label="p50" ms={metrics.latency_ms.p50} max={maxLatency} />
                            <LatencyBar label="p95" ms={metrics.latency_ms.p95} max={maxLatency} />
                            <LatencyBar label="p99" ms={metrics.latency_ms.p99} max={maxLatency} />
                          </div>
                          <p className="font-mono text-[9px] opacity-40 mt-2">avg {Math.round(metrics.latency_ms.avg)}ms</p>
                        </div>
                      )}

                      {/* RAG */}
                      {metrics.rag && ragRelevance > 0 && (
                        <div>
                          <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50 mb-2">RAG Relevance</p>
                          <div className="flex items-end gap-2">
                            <span className="font-display text-3xl" style={{ color: ragRelevance > 0.7 ? "var(--forest)" : ragRelevance > 0.5 ? "var(--ochre)" : "var(--terra)" }}>
                              {(ragRelevance * 100).toFixed(0)}
                            </span>
                            <span className="font-mono text-[10px] opacity-50 pb-1">/ 100 avg score</span>
                          </div>
                          <p className="font-mono text-[9px] opacity-40 mt-1">
                            min {((metrics.rag.relevance_score.min ?? 0) * 100).toFixed(0)} · max {((metrics.rag.relevance_score.max ?? 0) * 100).toFixed(0)}
                          </p>
                          <p className="font-mono text-[9px] opacity-40">
                            embed {Math.round(metrics.rag.embedding_latency_ms.avg ?? 0)}ms · retrieve {Math.round(metrics.rag.retrieval_latency_ms.avg ?? 0)}ms
                          </p>
                        </div>
                      )}

                      {/* Tokens */}
                      {metrics.tokens && (
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
                      )}

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

                  {/* Evaluation — offline RAGAS + keyword accuracy from /api/eval */}
                  {hasEval && evalData && <EvalSection data={evalData} />}
                </>
              )}
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

// ── Evaluation section ────────────────────────────────────────────────────────

function evalScoreColor(pct: number) {
  if (pct >= 80) return "var(--forest)";
  if (pct >= 60) return "var(--ochre)";
  return "var(--terra)";
}

function formatEvalTimestamp(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Renders the offline evaluation snapshot (RAGAS answer quality + keyword
 * accuracy) inside the live-telemetry drawer. Sits below the runtime metrics so
 * the concierge surfaces both "is it fast" and "is it correct".
 */
function EvalSection({ data }: { data: EvalSummary }) {
  const ragasEntries = Object.entries(data.ragas_scores);

  return (
    <div className="pt-4 border-t border-[var(--paper)]/10">
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-50">Evaluation</p>
        <span className="font-mono text-[8px] tracking-widest uppercase opacity-30">
          RAGAS · {formatEvalTimestamp(data.timestamp)}
        </span>
      </div>

      {/* Keyword accuracy headline + pass/fail */}
      <div className="flex items-end gap-3">
        <div className="flex items-end gap-1.5">
          <span
            className="font-display text-3xl leading-none"
            style={{ color: evalScoreColor(data.keyword_accuracy_pct) }}
          >
            {data.keyword_accuracy_pct.toFixed(0)}
          </span>
          <span className="font-mono text-[10px] opacity-50 pb-1">/ 100 keyword acc.</span>
        </div>
        <span className="font-mono text-[10px] opacity-40 pb-1 ml-auto">
          {data.passed}/{data.total_questions} passed
        </span>
      </div>

      {/* RAGAS metric bars */}
      {ragasEntries.length > 0 && (
        <div className="space-y-2 mt-3">
          {ragasEntries.map(([metric, score]) => {
            const pct = score == null ? null : score * 100;
            return (
              <div key={metric} className="flex items-center gap-2">
                <span className="font-mono text-[9px] opacity-60 w-28 truncate shrink-0">
                  {metric.replace(/_/g, " ")}
                </span>
                <div className="flex-1 h-1.5 bg-[var(--paper)]/10 rounded-full overflow-hidden">
                  {pct != null && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: evalScoreColor(pct) }}
                    />
                  )}
                </div>
                <span className="font-mono text-[10px] opacity-60 w-8 text-right shrink-0">
                  {pct == null ? "—" : pct.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[8px] tracking-widest uppercase opacity-30 mt-2.5">
        Offline · python -m eval.ragas_eval
      </p>
    </div>
  );
}
