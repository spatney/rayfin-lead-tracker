import { useMemo } from 'react';
import { Chart } from '@graphein/react';

import { GenerateDataButton, ResetDataButton } from '@/components/dataActions';
import {
  DollarIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/icons';
import {
  ChartCard,
  KpiCard,
  PageHeader,
  type Accent,
} from '@/components/ui';
import { useCrm } from '@/hooks/CrmContext';
import { repLeaderboard, type RepPerformance } from '@/services/analytics';
import { buildRepAttainmentSpec } from '@/services/chartSpecs';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '@/services/format';

const ACCENTS: Record<string, Accent> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function TeamPage() {
  const { deals, reps, loading } = useCrm();

  const perf = useMemo(() => repLeaderboard(deals, reps), [deals, reps]);

  const totals = useMemo(() => {
    const quota = reps.reduce((sum, r) => sum + r.quota, 0);
    const won = perf.reduce((sum, p) => sum + p.wonValue, 0);
    const pipeline = perf.reduce((sum, p) => sum + p.pipelineValue, 0);
    const avgAttainment =
      perf.length > 0
        ? perf.reduce((sum, p) => sum + p.attainment, 0) / perf.length
        : 0;
    return { quota, won, pipeline, avgAttainment };
  }, [reps, perf]);

  const attainmentSpec = useMemo(
    () => buildRepAttainmentSpec(perf),
    [perf]
  );

  const hasReps = reps.length > 0;

  if (loading && reps.length === 0) {
    return (
      <>
        <PageHeader title="Team" subtitle="Sales reps and quota attainment" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </>
    );
  }

  if (!hasReps) {
    return (
      <>
        <PageHeader title="Team" subtitle="Sales reps and quota attainment" />
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <UsersIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
              No team yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Generate a sample workspace to meet the sales team and track their
              quota attainment.
            </p>
            <div className="mt-6 flex justify-center">
              <GenerateDataButton />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${formatNumber(reps.length)} reps · ${formatPercent(totals.avgAttainment)} avg attainment`}
        actions={<ResetDataButton />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Reps"
          value={formatNumber(reps.length)}
          icon={UsersIcon}
          accent={ACCENTS.indigo}
        />
        <KpiCard
          label="Team quota"
          value={formatCompactCurrency(totals.quota)}
          icon={TargetIcon}
          accent={ACCENTS.amber}
        />
        <KpiCard
          label="Won value"
          value={formatCompactCurrency(totals.won)}
          icon={TrendingUpIcon}
          accent={ACCENTS.green}
        />
        <KpiCard
          label="Open pipeline"
          value={formatCompactCurrency(totals.pipeline)}
          icon={DollarIcon}
          accent={ACCENTS.sky}
        />
      </div>

      <div className="mt-5">
        <ChartCard
          title="Quota attainment by rep"
          subtitle="Closed-won value as a share of each rep's quota"
        >
          <div className="h-72">
            <Chart spec={attainmentSpec} />
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {perf.map((p) => (
          <RepCard key={p.rep.id} perf={p} />
        ))}
      </div>
    </>
  );
}

function RepCard({ perf }: { perf: RepPerformance }) {
  const { rep, wonValue, pipelineValue, openCount, wonCount, attainment } = perf;
  const pct = Math.min(100, Math.round(attainment * 100));
  const barColor =
    attainment >= 1
      ? 'bg-green-500'
      : attainment >= 0.6
        ? 'bg-amber-500'
        : 'bg-indigo-500';

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: rep.avatarColor }}
        >
          {initials(rep.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{rep.name}</p>
          <p className="truncate text-xs text-slate-500">{rep.title}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {rep.region}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Quota attainment</span>
          <span className="font-semibold tabular-nums text-slate-700">
            {formatPercent(attainment)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {formatCurrency(wonValue)} of {formatCurrency(rep.quota)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-900">
            {formatCompactCurrency(pipelineValue)}
          </p>
          <p className="text-xs text-slate-500">Pipeline</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-900">
            {formatNumber(openCount)}
          </p>
          <p className="text-xs text-slate-500">Open</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-900">
            {formatNumber(wonCount)}
          </p>
          <p className="text-xs text-slate-500">Won</p>
        </div>
      </div>
    </div>
  );
}
