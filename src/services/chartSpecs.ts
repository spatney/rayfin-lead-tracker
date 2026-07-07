import type { ChartSpec, ThemeInput } from 'graphein';

import {
  PIPELINE_STAGES,
  activityMeta,
  stageMeta,
  type DealItem,
} from './crmTypes';
import type {
  AccountValue,
  ActivityTypeCount,
  OverTimePoint,
  OwnerCount,
  RepPerformance,
  SourceCount,
  StageCount,
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

function themed(palette: string[]): ThemeInput {
  return { base: 'light', color: { ...baseColors, palette } };
}

/**
 * KPI scorecard tiles rendered by graphein's `kpi` visual. Left-aligned to match
 * the dashboard and enriched with a sparkline or comparison row; each is meant to
 * sit inside a rounded card container (which supplies the border/shadow chrome).
 */

/** Total deals, with a sparkline of new deals created per month. */
export function buildTotalDealsKpiSpec(
  totalDeals: number,
  overTime: OverTimePoint[]
): ChartSpec {
  return {
    type: 'kpi',
    theme: chartTheme,
    data: overTime.map((p) => ({ month: p.label, deals: p.deals })),
    value: totalDeals,
    format: ',d',
    label: 'Total deals',
    labelPosition: 'above',
    align: 'start',
    sparkline: { field: 'deals', markers: true },
    description: 'Total deals with the trend of new deals created per month.',
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

/** Funnel of the live pipeline, one trapezoid per stage, tinted by stage color. */
export function buildPipelineFunnelSpec(stages: StageCount[]): ChartSpec {
  return {
    type: 'funnel',
    theme: themed(PIPELINE_STAGES.map((stage) => stageMeta(stage).color)),
    data: stages.map((s) => ({ stage: s.stage, count: s.count })),
    encoding: {
      stage: { field: 'stage' },
      value: { field: 'count', title: 'Deals', format: ',d' },
    },
    percent: 'first',
    legend: false,
  };
}

/** Donut of deals by stage, sliced and colored to match the stage badges. */
export function buildStageDonutSpec(stages: StageCount[]): ChartSpec {
  return {
    type: 'pie',
    theme: themed(stages.map((s) => stageMeta(s.stage).color)),
    data: stages.map((s) => ({ stage: s.stage, count: s.count })),
    encoding: {
      theta: { field: 'count', format: ',d' },
      color: { field: 'stage' },
    },
    donut: 0.62,
    labels: { show: true, placement: 'auto', content: 'percent', minShare: 0.04 },
    legend: { show: true, position: 'right' },
  };
}

/**
 * Vertical bars of deal volume per acquisition source. Interactive: clicking a
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
      y: { field: 'count', title: 'Deals', format: ',d' },
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

/** Smooth area of new deals created per month over the trailing year. */
export function buildDealsOverTimeSpec(points: OverTimePoint[]): ChartSpec {
  return {
    type: 'area',
    theme: chartTheme,
    data: points.map((p) => ({ month: p.monthStart, deals: p.deals })),
    encoding: {
      x: { field: 'month', type: 'temporal', title: 'Month', format: '%b' },
      y: { field: 'deals', type: 'quantitative', title: 'New deals', format: ',d' },
    },
    curve: 'monotone',
    legend: false,
  };
}

/** Horizontal-reading bar of open pipeline value by owner (dashboard leaderboard). */
export function buildOwnerPipelineSpec(owners: OwnerCount[]): ChartSpec {
  return {
    type: 'bar',
    theme: chartTheme,
    data: owners.map((o) => ({ owner: o.ownerName, value: o.pipelineValue })),
    encoding: {
      x: { field: 'value', title: 'Open pipeline', format: '$.2s' },
      y: { field: 'owner', title: 'Owner' },
    },
    cornerRadius: 8,
    legend: false,
  };
}

/** Bar of quota attainment per rep, for the Team page. */
export function buildRepAttainmentSpec(perf: RepPerformance[]): ChartSpec {
  return {
    type: 'bar',
    theme: chartTheme,
    data: perf.map((p) => ({ rep: p.rep.name, attainment: p.attainment })),
    encoding: {
      x: { field: 'rep', title: 'Rep' },
      y: { field: 'attainment', title: 'Quota attainment', format: '.0%' },
    },
    cornerRadius: 8,
    legend: false,
  };
}

/** Donut of activities by type, colored to match the activity badges. */
export function buildActivityDonutSpec(types: ActivityTypeCount[]): ChartSpec {
  return {
    type: 'pie',
    theme: themed(types.map((t) => activityMeta(t.type).color)),
    data: types.map((t) => ({ type: t.type, count: t.count })),
    encoding: {
      theta: { field: 'count', format: ',d' },
      color: { field: 'type' },
    },
    donut: 0.62,
    labels: { show: true, placement: 'auto', content: 'percent', minShare: 0.05 },
    legend: { show: true, position: 'right' },
  };
}

/** Detail table of the highest-value opportunities with in-cell formatting. */
export function buildTopDealsTableSpec(deals: DealItem[]): ChartSpec {
  return {
    type: 'table',
    theme: chartTheme,
    data: deals.map((d) => ({
      name: d.name,
      account: d.accountName,
      stage: d.stage,
      value: d.value,
      score: d.score,
    })),
    columns: [
      { field: 'name', title: 'Deal' },
      { field: 'account', title: 'Account' },
      { field: 'stage', title: 'Stage' },
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

/** Detail table of the top accounts by total deal value. */
export function buildTopAccountsTableSpec(accounts: AccountValue[]): ChartSpec {
  return {
    type: 'table',
    theme: chartTheme,
    data: accounts.map((a) => ({
      account: a.accountName,
      industry: a.industry,
      deals: a.dealCount,
      open: a.openValue,
      won: a.wonValue,
    })),
    columns: [
      { field: 'account', title: 'Account' },
      { field: 'industry', title: 'Industry' },
      { field: 'deals', title: 'Deals', align: 'right', format: ',d' },
      {
        field: 'open',
        title: 'Open value',
        align: 'right',
        prefix: '$',
        format: ',d',
        conditionalFormat: { type: 'bar', color: '#0ea5e9', showValue: true },
      },
      {
        field: 'won',
        title: 'Won value',
        align: 'right',
        prefix: '$',
        format: ',d',
        conditionalFormat: { type: 'bar', color: '#22c55e', showValue: true },
      },
    ],
    sort: { field: 'open', order: 'desc' },
    density: 'standard',
    stickyHeader: true,
  };
}
