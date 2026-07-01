import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart, createSelectionStore, useSelection } from '@graphein/react';

import { ClearLeadsButton, GenerateLeadsButton } from '@/components/leadActions';
import {
  DollarIcon,
  FunnelIcon,
  LayersIcon,
  PenIcon,
  TargetIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons';
import { ChartCard, KpiCard, PageHeader, type Accent } from '@/components/ui';
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
  buildSourceBarSpec,
  buildStatusDonutSpec,
  buildTopLeadsTableSpec,
  withSketch,
} from '@/services/chartSpecs';
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
} from '@/services/format';

const INDIGO: Accent = { bg: 'bg-indigo-50', text: 'text-indigo-600' };
const SKY: Accent = { bg: 'bg-sky-50', text: 'text-sky-600' };
const GREEN: Accent = { bg: 'bg-green-50', text: 'text-green-600' };
const AMBER: Accent = { bg: 'bg-amber-50', text: 'text-amber-600' };

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />
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

function SketchToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      title="Toggle hand-drawn sketch style"
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        value
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700'
          : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
      }`}
    >
      <PenIcon className="h-4 w-4" />
      {value ? 'Sketch: On' : 'Sketch: Off'}
    </button>
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
        actions={
          <>
            <SketchToggle value={sketch} onChange={setSketch} />
            <ClearLeadsButton />
          </>
        }
      />

      {sourceFilter.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
          <FunnelIcon className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-900">
            Filtered by source
          </span>
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
          <button
            type="button"
            onClick={() => setSourceSel(null)}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-white"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total leads"
          value={formatNumber(kpis.totalLeads)}
          hint={`${formatNumber(kpis.openLeads)} open · avg score ${kpis.avgScore}`}
          icon={UsersIcon}
          accent={INDIGO}
        />
        <KpiCard
          label="Pipeline value"
          value={formatCompactCurrency(kpis.pipelineValue)}
          hint={`Across ${formatNumber(kpis.openLeads)} open deals`}
          icon={LayersIcon}
          accent={SKY}
        />
        <KpiCard
          label="Won value"
          value={formatCompactCurrency(kpis.wonValue)}
          hint={`${formatNumber(wonCount)} deals closed`}
          icon={DollarIcon}
          accent={GREEN}
        />
        <KpiCard
          label="Win rate"
          value={formatPercent(kpis.winRate)}
          hint={`${formatNumber(wonCount)} won · ${formatNumber(lostCount)} lost`}
          icon={TargetIcon}
          accent={AMBER}
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
