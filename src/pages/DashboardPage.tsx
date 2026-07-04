import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart, createSelectionStore, useSelection } from '@graphein/react';
import type { ChartSpec } from 'graphein';

import { GenerateLeadsButton } from '@/components/leadActions';
import {
  FunnelIcon,
  LayersIcon,
  MoreVerticalIcon,
  PenIcon,
  TrashIcon,
  XIcon,
} from '@/components/icons';
import { useDeleteAllLeads } from '@/hooks/useDeleteAllLeads';
import { ChartCard, PageHeader } from '@/components/ui';
import { useLeads } from '@/hooks/LeadsContext';
import {
  computeKpis,
  leadsByStatus,
  leadsBySource,
  leadsOverTime,
  pipelineByStage,
  topLeads,
} from '@/services/analytics';
import {
  buildLeadsOverTimeSpec,
  buildPipelineFunnelSpec,
  buildPipelineValueKpiSpec,
  buildSourceBarSpec,
  buildStatusDonutSpec,
  buildTopLeadsTableSpec,
  buildTotalLeadsKpiSpec,
  buildWinRateKpiSpec,
  buildWonValueKpiSpec,
  withSketch,
} from '@/services/chartSpecs';

function KpiTile({ spec }: { spec: ChartSpec }) {
  return (
    <div className="h-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm shadow-slate-200/40">
      <Chart spec={spec} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-8" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-4" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-5" />
        <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-7" />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
          <LayersIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
          Bring your pipeline to life
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          There are no leads yet. Generate a realistic sample dataset to explore
          the dashboard, or add leads by hand on the Leads page.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <GenerateLeadsButton count={1000} />
          <Link
            to="/leads"
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-indigo-600 hover:underline"
          >
            Add a lead manually
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
  const { run: deleteAllLeads, busy: deleting } = useDeleteAllLeads();

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
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${
          open ? 'bg-slate-50 text-slate-900' : ''
        }`}
      >
        <MoreVerticalIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-300/50"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sketch}
            onClick={() => onSketchChange(!sketch)}
            title="Toggle hand-drawn sketch style"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <PenIcon className="h-4 w-4 text-slate-400" />
            <span className="flex-1">Sketch style</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                sketch ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {sketch ? 'On' : 'Off'}
            </span>
          </button>

          <div className="my-1 h-px bg-slate-100" />

          <button
            type="button"
            role="menuitem"
            disabled={deleting}
            onClick={() => {
              setOpen(false);
              void deleteAllLeads();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="flex-1">Delete all leads</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { leads, loading } = useLeads();
  const [sketch, setSketch] = useState(false);

  // Shared selection bus: the bar chart publishes the clicked source here, and
  // we both read it (to cross-filter) and can clear it (to reset the bar).
  const store = useMemo(() => createSelectionStore(), []);
  const [sourceSel, setSourceSel] = useSelection(store, 'source');

  const sourceFilter = useMemo(() => {
    if (!sourceSel || sourceSel.kind !== 'point') return [];
    return sourceSel.tuples.map((tuple) => String(tuple[0]));
  }, [sourceSel]);

  // The bar chart always reflects every source, so all bars stay clickable.
  const bySource = useMemo(() => leadsBySource(leads), [leads]);
  const barSpec = useMemo(
    () => withSketch(buildSourceBarSpec(bySource), sketch),
    [bySource, sketch]
  );

  // Every other visual + the KPI tiles respect the clicked-source filter.
  const filteredLeads = useMemo(
    () =>
      sourceFilter.length > 0
        ? leads.filter((lead) => sourceFilter.includes(lead.source))
        : leads,
    [leads, sourceFilter]
  );

  const data = useMemo(() => {
    const kpis = computeKpis(filteredLeads);
    const statuses = leadsByStatus(filteredLeads);
    const stages = pipelineByStage(filteredLeads);
    const overTime = leadsOverTime(filteredLeads);
    const top = topLeads(filteredLeads, 8);
    const wonCount = statuses.find((s) => s.status === 'Won')?.count ?? 0;
    const lostCount = statuses.find((s) => s.status === 'Lost')?.count ?? 0;
    return { kpis, statuses, stages, overTime, top, wonCount, lostCount };
  }, [filteredLeads]);

  if (loading && leads.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your sales pipeline at a glance" />
        <DashboardSkeleton />
      </>
    );
  }

  if (leads.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your sales pipeline at a glance" />
        <EmptyDashboard />
      </>
    );
  }

  const { kpis, statuses, stages, overTime, top, wonCount, lostCount } = data;

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
            ? 'border-indigo-100 bg-indigo-50/70'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2">
          <FunnelIcon
            className={`h-4 w-4 ${
              sourceFilter.length > 0 ? 'text-indigo-600' : 'text-slate-400'
            }`}
          />
          <span
            className={`text-sm font-medium ${
              sourceFilter.length > 0 ? 'text-indigo-900' : 'text-slate-500'
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
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                >
                  {source}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400">
              — click a bar in “Leads by source” to filter the dashboard
            </span>
          )}
        </div>

        {sourceFilter.length > 0 ? (
          <button
            type="button"
            onClick={() => setSourceSel(null)}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-white"
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
            buildTotalLeadsKpiSpec(kpis.totalLeads, overTime),
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
          title="New leads over time"
          subtitle="Leads created per month, trailing 12 months"
          className="lg:col-span-8"
        >
          <div className="h-72">
            <Chart spec={withSketch(buildLeadsOverTimeSpec(overTime), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Leads by status"
          subtitle="Distribution across the pipeline"
          className="lg:col-span-4"
        >
          <div className="h-72">
            <Chart spec={withSketch(buildStatusDonutSpec(statuses), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Pipeline funnel"
          subtitle="Conversion from new to won"
          className="lg:col-span-5"
        >
          <div className="h-80">
            <Chart spec={withSketch(buildPipelineFunnelSpec(stages), sketch)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Leads by source"
          subtitle="Click a bar to filter the dashboard"
          className="lg:col-span-7"
        >
          <div className="h-80">
            <Chart spec={barSpec} store={store} />
          </div>
        </ChartCard>

        <ChartCard
          title="Top opportunities"
          subtitle="Highest-value deals in play"
          className="lg:col-span-12"
        >
          <div className="h-96">
            <Chart spec={withSketch(buildTopLeadsTableSpec(top), sketch)} />
          </div>
        </ChartCard>
      </div>
    </>
  );
}
