import { useMemo, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Chart } from '@graphein/react';
import type { ChartSpec } from 'graphein';

import { ChartCard, KpiCard, PageHeader, type Accent } from '@/components/ui';
import {
  ActivityIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  TrendingUpIcon,
} from '@/components/icons';
import { chartTheme } from '@/services/chartSpecs';
import { formatDuration, formatNumber } from '@/services/format';
import {
  clearMetrics,
  getMetrics,
  subscribeMetrics,
  summarizeByKind,
  type MetricEntry,
  type MetricKind,
} from '@/services/metrics';

const INDIGO: Accent = { bg: 'bg-indigo-50', text: 'text-indigo-600' };
const GREEN: Accent = { bg: 'bg-green-50', text: 'text-green-600' };
const SKY: Accent = { bg: 'bg-sky-50', text: 'text-sky-600' };
const AMBER: Accent = { bg: 'bg-amber-50', text: 'text-amber-600' };

const KIND_META: Record<MetricKind, { label: string; badge: string; dot: string }> = {
  query: { label: 'Query', badge: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  insert: { label: 'Insert', badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  create: { label: 'Create', badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  update: { label: 'Update', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  delete: { label: 'Delete', badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

const WRITE_KINDS: MetricKind[] = ['insert', 'create', 'update', 'delete'];

function rate(rowsPerSec: number): string {
  if (!rowsPerSec || !Number.isFinite(rowsPerSec)) return '—';
  return `${formatNumber(Math.round(rowsPerSec))}/s`;
}

function timeOfDay(at: number): string {
  return new Date(at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function useMetrics(): MetricEntry[] {
  return useSyncExternalStore(subscribeMetrics, getMetrics);
}

function KindBadge({ kind }: { kind: MetricKind }) {
  const meta = KIND_META[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ClearStatsButton() {
  return (
    <button
      type="button"
      onClick={() => clearMetrics()}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
    >
      <TrashIcon className="h-4 w-4" />
      Clear stats
    </button>
  );
}

function EmptyMetrics() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <ActivityIcon className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
        No operations captured yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Every data operation is timed automatically. Generate or clear sample
        leads, load the dashboard, or edit a lead, and its latency and throughput
        will appear here.
      </p>
      <div className="mt-6">
        <Link
          to="/leads"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
        >
          Go to Leads
        </Link>
      </div>
    </div>
  );
}

export function MetricsPage() {
  const metrics = useMetrics();
  const summaries = useMemo(() => summarizeByKind(metrics), [metrics]);

  const overall = useMemo(() => {
    const totalOps = metrics.length;
    const queries = metrics.filter((m) => m.kind === 'query').length;
    const writes = metrics.filter((m) => WRITE_KINDS.includes(m.kind)).length;
    const rowsWritten = metrics
      .filter((m) => m.kind === 'insert' || m.kind === 'create')
      .reduce((sum, m) => sum + m.count, 0);
    const rowsDeleted = metrics
      .filter((m) => m.kind === 'delete')
      .reduce((sum, m) => sum + m.count, 0);
    const insert = summaries.find((s) => s.kind === 'insert');
    const query = summaries.find((s) => s.kind === 'query');
    return { totalOps, queries, writes, rowsWritten, rowsDeleted, insert, query };
  }, [metrics, summaries]);

  const latencySpec = useMemo<ChartSpec>(
    () => ({
      type: 'bar',
      theme: chartTheme,
      data: summaries.map((s) => ({
        op: KIND_META[s.kind].label,
        ms: Math.round(s.avgMs),
      })),
      encoding: {
        x: { field: 'op', title: 'Operation' },
        y: { field: 'ms', title: 'Avg latency (ms)', format: ',d' },
      },
      cornerRadius: 8,
      legend: false,
    }),
    [summaries]
  );

  const recent = useMemo(() => [...metrics].reverse().slice(0, 60), [metrics]);

  if (metrics.length === 0) {
    return (
      <>
        <PageHeader
          title="Performance"
          subtitle="Live timing for every data operation"
        />
        <EmptyMetrics />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle="Live timing for every data operation"
        actions={<ClearStatsButton />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Operations tracked"
          value={formatNumber(overall.totalOps)}
          hint={`${formatNumber(overall.queries)} queries · ${formatNumber(overall.writes)} writes`}
          icon={ActivityIcon}
          accent={INDIGO}
        />
        <KpiCard
          label="Records written"
          value={formatNumber(overall.rowsWritten)}
          hint={`${formatNumber(overall.rowsDeleted)} deleted`}
          icon={PlusIcon}
          accent={GREEN}
        />
        <KpiCard
          label="Insert throughput"
          value={overall.insert ? rate(overall.insert.rowsPerSec) : '—'}
          hint={
            overall.insert
              ? `across ${formatNumber(overall.insert.ops)} inserts`
              : 'no inserts yet'
          }
          icon={TrendingUpIcon}
          accent={SKY}
        />
        <KpiCard
          label="Avg query time"
          value={overall.query ? formatDuration(overall.query.avgMs) : '—'}
          hint={
            overall.query
              ? `${formatNumber(overall.query.ops)} loads · max ${formatDuration(overall.query.maxMs)}`
              : 'no queries yet'
          }
          icon={ClockIcon}
          accent={AMBER}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="Average latency by operation"
          subtitle="Mean wall-clock time per operation type"
          className="lg:col-span-6"
        >
          <div className="h-72">
            <Chart spec={latencySpec} />
          </div>
        </ChartCard>

        <ChartCard
          title="By operation"
          subtitle="Totals and throughput per operation type"
          className="lg:col-span-6"
        >
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Operation</th>
                  <th className="px-2 py-2 text-right">Ops</th>
                  <th className="px-2 py-2 text-right">Rows</th>
                  <th className="px-2 py-2 text-right">Avg</th>
                  <th className="px-2 py-2 text-right">Max</th>
                  <th className="px-2 py-2 text-right">Throughput</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr
                    key={s.kind}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-2 py-2.5">
                      <KindBadge kind={s.kind} />
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                      {formatNumber(s.ops)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                      {formatNumber(s.rows)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                      {formatDuration(s.avgMs)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                      {formatDuration(s.maxMs)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-medium text-slate-900">
                      {rate(s.rowsPerSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          title="Recent operations"
          subtitle={`Most recent ${formatNumber(recent.length)} of ${formatNumber(metrics.length)} captured`}
          className="lg:col-span-12"
        >
          <div className="-mx-1 max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Operation</th>
                  <th className="px-2 py-2">Detail</th>
                  <th className="px-2 py-2 text-right">Rows</th>
                  <th className="px-2 py-2 text-right">Duration</th>
                  <th className="px-2 py-2 text-right">Throughput</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => {
                  const perSec =
                    entry.count > 0 && entry.durationMs > 0
                      ? (entry.count / entry.durationMs) * 1000
                      : 0;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-500">
                        {timeOfDay(entry.at)}
                      </td>
                      <td className="px-2 py-2.5">
                        <KindBadge kind={entry.kind} />
                      </td>
                      <td className="px-2 py-2.5 text-slate-700">{entry.label}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                        {formatNumber(entry.count)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                        {formatDuration(entry.durationMs)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-medium text-slate-900">
                        {rate(perSec)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
