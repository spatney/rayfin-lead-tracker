/**
 * Lightweight client-side performance recorder. Every data operation (query,
 * insert, delete, …) is timed with `performance.now()` and pushed here so the
 * Metrics page can show live throughput/latency. State is module-level (shared
 * across the app) and mirrored to localStorage so history survives reloads.
 */

export type MetricKind = 'query' | 'insert' | 'create' | 'update' | 'delete';

export interface MetricEntry {
  id: string;
  kind: MetricKind;
  /** Human label, e.g. "Generate 1,000 leads". */
  label: string;
  /** Rows affected by the operation. */
  count: number;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** Epoch milliseconds when the operation finished. */
  at: number;
}

export interface KindSummary {
  kind: MetricKind;
  ops: number;
  rows: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
  rowsPerSec: number;
}

const STORAGE_KEY = 'leadflow.metrics.v1';
const MAX_ENTRIES = 250;
export const METRIC_KINDS: MetricKind[] = [
  'query',
  'insert',
  'create',
  'update',
  'delete',
];

let entries: MetricEntry[] = load();
const listeners = new Set<() => void>();

function load(): MetricEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MetricEntry[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable or over quota — metrics are best-effort */
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function recordMetric(
  kind: MetricKind,
  label: string,
  count: number,
  durationMs: number
): void {
  const entry: MetricEntry = {
    id: makeId(),
    kind,
    label,
    count,
    durationMs,
    at: Date.now(),
  };
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  persist();
  emit();
}

/**
 * Time an async operation and record the result. `countOf` derives the number
 * of affected rows from the resolved value. Failures are not recorded (the
 * error propagates unchanged).
 */
export async function timed<T>(
  kind: MetricKind,
  label: string,
  fn: () => Promise<T>,
  countOf: (result: T) => number
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  recordMetric(kind, label, countOf(result), performance.now() - start);
  return result;
}

export function getMetrics(): MetricEntry[] {
  return entries;
}

export function clearMetrics(): void {
  if (entries.length === 0) return;
  entries = [];
  persist();
  emit();
}

/** Subscribe to metric changes (for `useSyncExternalStore`). */
export function subscribeMetrics(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Aggregate entries by operation kind, ordered by {@link METRIC_KINDS}. */
export function summarizeByKind(list: MetricEntry[]): KindSummary[] {
  return METRIC_KINDS.map((kind) => {
    const group = list.filter((entry) => entry.kind === kind);
    const ops = group.length;
    const rows = group.reduce((sum, entry) => sum + entry.count, 0);
    const totalMs = group.reduce((sum, entry) => sum + entry.durationMs, 0);
    const maxMs = group.reduce((max, entry) => Math.max(max, entry.durationMs), 0);
    return {
      kind,
      ops,
      rows,
      totalMs,
      avgMs: ops > 0 ? totalMs / ops : 0,
      maxMs,
      rowsPerSec: totalMs > 0 ? (rows / totalMs) * 1000 : 0,
    };
  }).filter((summary) => summary.ops > 0);
}
