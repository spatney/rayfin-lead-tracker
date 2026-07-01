import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Chart } from '@graphein/react';

import { ClearLeadsButton, GenerateLeadsButton } from '@/components/leadActions';
import {
  DollarIcon,
  LayersIcon,
  TargetIcon,
  UsersIcon,
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

export function DashboardPage() {
  const { leads, loading } = useLeads();

  const data = useMemo(() => {
    const kpis = computeKpis(leads);
    const statuses = leadsByStatus(leads);
    const stages = pipelineByStage(leads);
    const sources = leadsBySource(leads);
    const overTime = leadsOverTime(leads);
    const top = topLeads(leads, 8);
    const wonCount = statuses.find((s) => s.status === 'Won')?.count ?? 0;
    const lostCount = statuses.find((s) => s.status === 'Lost')?.count ?? 0;
    return { kpis, statuses, stages, sources, overTime, top, wonCount, lostCount };
  }, [leads]);

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

  const { kpis, statuses, stages, sources, overTime, top, wonCount, lostCount } =
    data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your sales pipeline at a glance"
        actions={<ClearLeadsButton />}
      />

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
            <Chart spec={buildLeadsOverTimeSpec(overTime)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Leads by status"
          subtitle="Distribution across the pipeline"
          className="lg:col-span-4"
        >
          <div className="h-72">
            <Chart spec={buildStatusDonutSpec(statuses)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Pipeline funnel"
          subtitle="Conversion from new to won"
          className="lg:col-span-5"
        >
          <div className="h-80">
            <Chart spec={buildPipelineFunnelSpec(stages)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Leads by source"
          subtitle="Where your leads come from"
          className="lg:col-span-7"
        >
          <div className="h-80">
            <Chart spec={buildSourceBarSpec(sources)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Top opportunities"
          subtitle="Highest-value deals in play"
          className="lg:col-span-12"
        >
          <div className="h-96">
            <Chart spec={buildTopLeadsTableSpec(top)} />
          </div>
        </ChartCard>
      </div>
    </>
  );
}
