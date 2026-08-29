import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSelectionStore, useSelection } from '@graphein/react';
import type { ChartSpec } from 'graphein';

import { GenerateDataButton } from '@/components/dataActions';
import { ThemedChart } from '@/components/ThemedChart';
import {
  FunnelIcon,
  LayersIcon,
  MoreVerticalIcon,
  PenIcon,
  TrashIcon,
  XIcon,
} from '@/components/icons';
import { useResetWorkspace } from '@/hooks/useResetWorkspace';
import { ChartCard, PageHeader } from '@/components/ui';
import { useCrm } from '@/hooks/CrmContext';
import { useDealAggregates } from '@/hooks/useDealAggregates';
import { activityMeta } from '@/services/crmTypes';
import type { ActivityItem } from '@/services/crmTypes';
import { relativeTime } from '@/services/format';
import { recentActivities, topDeals } from '@/services/analytics';
import {
  buildDealsOverTimeSpec,
  buildOwnerPipelineSpec,
  buildPipelineFunnelSpec,
  buildPipelineValueKpiSpec,
  buildSourceBarSpec,
  buildStageDonutSpec,
  buildTopDealsTableSpec,
  buildTotalDealsKpiSpec,
  buildWinRateKpiSpec,
  buildWonValueKpiSpec,
  withSketch,
} from '@/services/chartSpecs';

function KpiTile({ spec }: { spec: ChartSpec }) {
  return (
    <div className="h-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <ThemedChart spec={spec} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-8 dark:bg-slate-800/70" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-4 dark:bg-slate-800/70" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-5 dark:bg-slate-800/70" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-7 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
          <LayersIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Bring your pipeline to life
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          There's no data yet. Generate a realistic sample workspace — accounts,
          contacts, deals, reps and activity — to explore the dashboard.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <GenerateDataButton />
          <Link
            to="/deals"
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-400"
          >
            Add a deal manually
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeaderMenu({
  sketch,
  onSketchChange,
}: {
  sketch: boolean;
  onSketchChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { run: resetWorkspace, busy: resetting, progress } = useResetWorkspace();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${
          open ? 'bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100' : ''
        }`}
      >
        <MoreVerticalIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-300/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sketch}
            onClick={() => onSketchChange(!sketch)}
            title="Toggle hand-drawn sketch style"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <PenIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="flex-1">Sketch style</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                sketch ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {sketch ? 'On' : 'Off'}
            </span>
          </button>

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />

          <button
            type="button"
            role="menuitem"
            disabled={resetting}
            onClick={() => {
              setOpen(false);
              void resetWorkspace();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            {resetting ? (
              <span className="flex h-4 w-4 items-center justify-center">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </span>
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            <span className="flex-1">
              {resetting ? `Resetting… ${progress.percent}%` : 'Reset app'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function RecentActivityList({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        No activity logged yet.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {activities.map((activity) => {
        const meta = activityMeta(activity.type);
        return (
          <li key={activity.id} className="flex items-start gap-3 py-2.5">
            <span
              className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {activity.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {activity.subject}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {activity.dealName} · {activity.ownerName}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
              {relativeTime(activity.occurredAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardPage() {
  const { deals, activities } = useCrm();
  const [sketch, setSketch] = useState(false);

  // Shared selection bus: the bar chart publishes the clicked source here, and
  // we both read it (to cross-filter) and can clear it (to reset the bar).
  const store = useMemo(() => createSelectionStore(), []);
  const [sourceSel, setSourceSel] = useSelection(store, 'source');

  const sourceFilter = useMemo(() => {
    if (!sourceSel || sourceSel.kind !== 'point') return [];
    return sourceSel.tuples.map((tuple) => String(tuple[0]));
  }, [sourceSel]);

  // Every KPI and breakdown below is rolled up in SQL: the selected source is
  // pushed into the query rather than filtering rows in the browser.
  const { data, loading } = useDealAggregates(sourceFilter);
  const { kpis, stageCounts, funnel, sourceCounts, owners, overTime, wonCount, lostCount } =
    data;

  const barSpec = useMemo(
    () => withSketch(buildSourceBarSpec(sourceCounts), sketch),
    [sourceCounts, sketch]
  );

  // Row-level panels still read the loaded workspace: they show individual
  // records, which an aggregation cannot return.
  const filteredDeals = useMemo(
    () =>
      sourceFilter.length > 0
        ? deals.filter((deal) => sourceFilter.includes(deal.source))
        : deals,
    [deals, sourceFilter]
  );
  const top = useMemo(() => topDeals(filteredDeals, 8), [filteredDeals]);
  const recent = useMemo(() => recentActivities(activities, 7), [activities]);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your sales pipeline at a glance" />
        <DashboardSkeleton />
      </>
    );
  }

  if (kpis.totalDeals === 0 && sourceFilter.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your sales pipeline at a glance" />
        <EmptyDashboard />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your sales pipeline at a glance"
        actions={<HeaderMenu sketch={sketch} onSketchChange={setSketch} />}
      />

      {/* Persistent filter toolbar: this row always occupies the same space, so
          applying or clearing a source filter never shifts the dashboard below. */}
      <div
        className={`mb-5 flex min-h-[4.25rem] items-center gap-3 rounded-2xl border px-4 py-3 ${
          sourceFilter.length > 0
            ? 'border-indigo-100 bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-500/10'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2">
          <FunnelIcon
            className={`h-4 w-4 ${
              sourceFilter.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          <span
            className={`text-sm font-medium ${
              sourceFilter.length > 0 ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {sourceFilter.length > 0 ? 'Filtered by source' : 'Showing all sources'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {sourceFilter.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {sourceFilter.map((source) => (
                <span
                  key={source}
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:text-indigo-300 dark:ring-indigo-500/30"
                >
                  {source}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              — click a bar in “Deals by source” to filter the dashboard
            </span>
          )}
        </div>

        {sourceFilter.length > 0 ? (
          <button
            type="button"
            onClick={() => setSourceSel(null)}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-white dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear filter
          </button>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold opacity-0"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          spec={withSketch(
            buildTotalDealsKpiSpec(kpis.totalDeals, overTime),
            sketch
          )}
        />
        <KpiTile
          spec={withSketch(
            buildPipelineValueKpiSpec(kpis.pipelineValue, overTime),
            sketch
          )}
        />
        <KpiTile
          spec={withSketch(
            buildWonValueKpiSpec(kpis.wonValue, kpis.lostValue),
            sketch
          )}
        />
        <KpiTile
          spec={withSketch(
            buildWinRateKpiSpec(kpis.winRate, wonCount, lostCount),
            sketch
          )}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="New deals over time"
          subtitle="Deals created per month, trailing 12 months"
          className="lg:col-span-8"
        >
          <div className="h-72">
            <ThemedChart spec={withSketch(buildDealsOverTimeSpec(overTime), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Deals by stage"
          subtitle="Distribution across the pipeline"
          className="lg:col-span-4"
        >
          <div className="h-72">
            <ThemedChart spec={withSketch(buildStageDonutSpec(stageCounts), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Pipeline funnel"
          subtitle="Conversion from new to won"
          className="lg:col-span-5"
        >
          <div className="h-80">
            <ThemedChart spec={withSketch(buildPipelineFunnelSpec(funnel), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Deals by source"
          subtitle="Click a bar to filter the dashboard"
          className="lg:col-span-7"
        >
          <div className="h-80">
            <ThemedChart spec={barSpec} store={store} />
          </div>
        </ChartCard>

        <ChartCard
          title="Top opportunities"
          subtitle="Highest-value deals in play"
          className="lg:col-span-12"
        >
          <div className="h-96">
            <ThemedChart spec={withSketch(buildTopDealsTableSpec(top), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Pipeline by owner"
          subtitle="Open pipeline value per account executive"
          className="lg:col-span-7"
        >
          <div className="h-80">
            <ThemedChart spec={withSketch(buildOwnerPipelineSpec(owners), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Recent activity"
          subtitle="Latest calls, emails and meetings"
          className="lg:col-span-5"
        >
          <div className="h-80 overflow-auto pr-1">
            <RecentActivityList activities={recent} />
          </div>
        </ChartCard>
      </div>
    </>
  );
}
