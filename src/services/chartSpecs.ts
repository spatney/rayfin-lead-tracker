import type { ChartSpec, ThemeInput } from 'graphein';

import {
  PIPELINE_STAGES,
  statusMeta,
  type LeadItem,
} from './leadTypes';
import type {
  OverTimePoint,
  SourceCount,
  StageCount,
  StatusCount,
} from './analytics';

const PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#f59e0b',
  '#a855f7',
  '#22c55e',
  '#fb7185',
  '#f97316',
  '#3b82f6',
  '#84cc16',
];

const baseColors = {
  background: '#ffffff',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#475569',
  axis: '#cbd5e1',
  grid: '#eef2f6',
  border: '#e8edf3',
  accent: '#6366f1',
  palette: PALETTE,
  positive: '#16a34a',
  negative: '#ef4444',
};

export const chartTheme: ThemeInput = { base: 'light', color: baseColors };

/** Toggle graphein's hand-drawn "sketch" rendering on any spec. */
export function withSketch(spec: ChartSpec, sketch: boolean): ChartSpec {
  return { ...spec, sketch };
}

/**
 * KPI scorecard tiles rendered by graphein's `kpi` visual. Left-aligned to match
 * the dashboard and enriched with a sparkline or comparison row; each is meant to
 * sit inside a rounded card container (which supplies the border/shadow chrome).
 */

/** Total leads, with a sparkline of new leads created per month. */
export function buildTotalLeadsKpiSpec(
  totalLeads: number,
  overTime: OverTimePoint[]
): ChartSpec {
  return {
    type: 'kpi',
    theme: chartTheme,
    data: overTime.map((p) => ({ month: p.label, leads: p.leads })),
    value: totalLeads,
    format: ',d',
    label: 'Total leads',
    labelPosition: 'above',
    align: 'start',
    sparkline: { field: 'leads', markers: true },
    description: 'Total leads with the trend of new leads created per month.',
  };
}

/** Open-pipeline value, with a sparkline of deal value created per month. */
export function buildPipelineValueKpiSpec(
  pipelineValue: number,
  overTime: OverTimePoint[]
): ChartSpec {
  return {
    type: 'kpi',
    theme: chartTheme,
    data: overTime.map((p) => ({ month: p.label, value: p.value })),
    value: pipelineValue,
    format: '$.2s',
    label: 'Pipeline value',
    labelPosition: 'above',
    align: 'start',
    sparkline: { field: 'value', markers: true },
    description: 'Open pipeline value with the trend of deal value created per month.',
  };
}

/** Won value, compared against lost value. */
export function buildWonValueKpiSpec(
  wonValue: number,
  lostValue: number
): ChartSpec {
  const delta =
    lostValue > 0 ? (wonValue - lostValue) / lostValue : wonValue > 0 ? 1 : 0;
  return {
    type: 'kpi',
    theme: chartTheme,
    value: wonValue,
    format: '$.2s',
    label: 'Won value',
    labelPosition: 'above',
    align: 'start',
    comparisons: [
      { label: 'vs lost', delta, amount: wonValue - lostValue, amountFormat: '$.2s' },
    ],
    description: 'Total won value compared with lost value.',
  };
}

/** Win rate, with the net win margin across decided deals. */
export function buildWinRateKpiSpec(
  winRate: number,
  wonCount: number,
  lostCount: number
): ChartSpec {
  const decided = wonCount + lostCount;
  const delta = decided > 0 ? (wonCount - lostCount) / decided : 0;
  return {
    type: 'kpi',
    theme: chartTheme,
    value: winRate,
    format: '.0%',
    label: 'Win rate',
    labelPosition: 'above',
    align: 'start',
    comparisons: [{ label: 'Decided', delta, amount: decided, amountFormat: ',d' }],
    description: 'Win rate across decided deals, with the net win margin.',
  };
}

function themed(palette: string[]): ThemeInput {
  return { base: 'light', color: { ...baseColors, palette } };
}

/** Funnel of the live pipeline, one trapezoid per stage, tinted by stage color. */
export function buildPipelineFunnelSpec(stages: StageCount[]): ChartSpec {
  return {
    type: 'funnel',
    theme: themed(PIPELINE_STAGES.map((stage) => statusMeta(stage).color)),
    data: stages.map((s) => ({ stage: s.stage, count: s.count })),
    encoding: {
      stage: { field: 'stage' },
      value: { field: 'count', title: 'Leads', format: ',d' },
    },
    percent: 'first',
    legend: false,
  };
}

/** Donut of leads by status, sliced and colored to match the status badges. */
export function buildStatusDonutSpec(statuses: StatusCount[]): ChartSpec {
  return {
    type: 'pie',
    theme: themed(statuses.map((s) => statusMeta(s.status).color)),
    data: statuses.map((s) => ({ status: s.status, count: s.count })),
    encoding: {
      theta: { field: 'count', format: ',d' },
      color: { field: 'status' },
    },
    donut: 0.62,
    labels: { show: true, placement: 'auto', content: 'percent', minShare: 0.04 },
    legend: { show: true, position: 'right' },
  };
}

/**
 * Vertical bars of lead volume per acquisition source. Interactive: clicking a
 * bar publishes a `source` point-selection (for dashboard cross-filtering) and
 * highlights the picked bar while dimming the rest.
 */
export function buildSourceBarSpec(sources: SourceCount[]): ChartSpec {
  return {
    type: 'bar',
    theme: chartTheme,
    data: sources.map((s) => ({ source: s.source, count: s.count })),
    encoding: {
      x: { field: 'source', title: 'Source' },
      y: { field: 'count', title: 'Leads', format: ',d' },
    },
    cornerRadius: 8,
    legend: false,
    params: [
      {
        name: 'source',
        select: { type: 'point', on: 'click', fields: ['source'], empty: 'all' },
      },
    ],
    highlight: { param: 'source' },
  };
}

/** Smooth area of new leads created per month over the trailing year. */
export function buildLeadsOverTimeSpec(points: OverTimePoint[]): ChartSpec {
  return {
    type: 'area',
    theme: chartTheme,
    data: points.map((p) => ({ month: p.monthStart, leads: p.leads })),
    encoding: {
      x: { field: 'month', type: 'temporal', title: 'Month', format: '%b' },
      y: { field: 'leads', type: 'quantitative', title: 'New leads', format: ',d' },
    },
    curve: 'monotone',
    legend: false,
  };
}

/** Detail table of the highest-value opportunities with in-cell formatting. */
export function buildTopLeadsTableSpec(leads: LeadItem[]): ChartSpec {
  return {
    type: 'table',
    theme: chartTheme,
    data: leads.map((l) => ({
      name: l.name,
      company: l.company,
      status: l.status,
      value: l.value,
      score: l.score,
    })),
    columns: [
      { field: 'name', title: 'Lead' },
      { field: 'company', title: 'Company' },
      { field: 'status', title: 'Stage' },
      {
        field: 'value',
        title: 'Deal value',
        align: 'right',
        prefix: '$',
        format: ',d',
        conditionalFormat: { type: 'bar', color: '#6366f1', showValue: true },
      },
      {
        field: 'score',
        title: 'Score',
        align: 'right',
        conditionalFormat: { type: 'icon', set: 'trafficLights' },
      },
    ],
    sort: { field: 'value', order: 'desc' },
    density: 'standard',
    stickyHeader: true,
  };
}
