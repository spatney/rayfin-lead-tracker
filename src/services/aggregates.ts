/**
 * Server-side aggregation layer.
 *
 * Rayfin's GraphQL client can push `groupBy` + `sum/avg/min/max/count` down to
 * SQL through Data API Builder, so the dashboard's headline numbers no longer
 * require every deal row to be shipped to the browser and folded in JavaScript.
 * A workspace with 10,000 deals collapses to a handful of rows per query.
 *
 * Everything here returns the same shapes `analytics.ts` produces from in-memory
 * rows, so the aggregate path and the client-side fallback are interchangeable.
 *
 * DAB constraints that shape the queries below:
 *  - every aggregation operand must be a **numeric** column, so a row count is
 *    expressed as `count: 'value'` (`Deal.value` is a non-nullable `@int()`).
 *  - `groupBy` and row selection are mutually exclusive, and `where` must be
 *    applied before `aggregate`.
 *  - there is no date-truncation function, so monthly buckets are issued as one
 *    filtered grand total per month (in parallel — tiny payloads, one round trip
 *    of wall-clock latency).
 */

import { getRayfinClient } from './rayfinClient';
import { timed } from './metrics';
import {
  cumulativeFunnel,
  kpisFromRollup,
  monthBuckets,
  ownerCountsFromRollup,
  repPerformanceFromRollup,
  stageCountsFromRollup,
  type Kpis,
  type OverTimePoint,
  type OwnerCount,
  type OwnerStageRollup,
  type RepPerformance,
  type SourceCount,
  type StageCount,
  type StageRollup,
} from './analytics';
import type { RepItem } from './crmTypes';

type DealClient = ReturnType<typeof getRayfinClient>['data']['Deal'];
type DealFilter = Parameters<DealClient['where']>[0];

/** Scope every aggregation to a subset of the pipeline. */
export interface DealScope {
  /** Restrict to these deal sources; empty or omitted means every source. */
  sources?: string[];
}

/** Everything the dashboard needs, computed entirely in SQL. */
export interface DashboardAggregates {
  kpis: Kpis;
  stageCounts: StageCount[];
  funnel: StageCount[];
  sourceCounts: SourceCount[];
  owners: OwnerCount[];
  overTime: OverTimePoint[];
  wonCount: number;
  lostCount: number;
}

export const EMPTY_AGGREGATES: DashboardAggregates = {
  kpis: {
    totalDeals: 0,
    openDeals: 0,
    pipelineValue: 0,
    weightedPipeline: 0,
    wonValue: 0,
    lostValue: 0,
    winRate: 0,
    avgScore: 0,
    newThisMonth: 0,
  },
  stageCounts: [],
  funnel: [],
  sourceCounts: [],
  owners: [],
  overTime: [],
  wonCount: 0,
  lostCount: 0,
};

/** `sum`/`min`/`max`/`avg` are nullable over empty groups; treat null as zero. */
function num(value: number | null | undefined): number {
  return value ?? 0;
}

function scopeFilter(scope?: DealScope): DealFilter | undefined {
  const sources = scope?.sources ?? [];
  return sources.length > 0 ? { source: { in: sources } } : undefined;
}

/**
 * One row per (stage, probability) pair. Grouping on `probability` as well as
 * `stage` keeps weighted pipeline — a per-row `value × probability` product SQL
 * cannot aggregate directly — exact, because within a group both factors are
 * constant. Cardinality stays at a handful of rows.
 */
async function fetchStageRollup(filter?: DealFilter): Promise<StageRollup[]> {
  const deals = getRayfinClient().data.Deal;
  const grouped = filter
    ? deals.where(filter).groupBy(['stage', 'probability'])
    : deals.groupBy(['stage', 'probability']);

  const rows = await grouped
    .aggregate({
      deals: { count: 'value' },
      value: { sum: 'value' },
      score: { sum: 'score' },
    })
    .execute();

  return rows.map((row) => ({
    stage: String(row.fields.stage),
    probability: Number(row.fields.probability),
    count: row.aggregations.deals,
    value: num(row.aggregations.value),
    scoreSum: num(row.aggregations.score),
  }));
}

/**
 * One row per acquisition source. Deliberately unscoped: the source bar chart
 * drives the dashboard cross-filter, so every bar has to stay visible and
 * clickable even while one of them is selected.
 */
async function fetchSourceCounts(): Promise<SourceCount[]> {
  const rows = await getRayfinClient()
    .data.Deal.groupBy(['source'])
    .aggregate({ deals: { count: 'value' } })
    .execute();

  return rows
    .map((row) => ({ source: String(row.fields.source), count: row.aggregations.deals }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** One row per (owner, stage) pair — feeds both owner pipeline and the leaderboard. */
async function fetchOwnerRollup(filter?: DealFilter): Promise<OwnerStageRollup[]> {
  const deals = getRayfinClient().data.Deal;
  const grouped = filter
    ? deals.where(filter).groupBy(['owner_id', 'stage'])
    : deals.groupBy(['owner_id', 'stage']);

  const rows = await grouped
    .aggregate({ deals: { count: 'value' }, value: { sum: 'value' } })
    .execute();

  return rows.map((row) => ({
    ownerId: String(row.fields.owner_id),
    stage: String(row.fields.stage),
    count: row.aggregations.deals,
    value: num(row.aggregations.value),
  }));
}

/**
 * Trailing-`months` series of deals created per month. DAB cannot truncate a
 * date, so each bucket is its own grand-total aggregation over a half-open
 * `createdAt` range; they run concurrently.
 */
async function fetchOverTime(months: number, filter?: DealFilter): Promise<OverTimePoint[]> {
  const deals = getRayfinClient().data.Deal;
  const buckets = monthBuckets(months);

  const results = await Promise.all(
    buckets.map((bucket) =>
      deals
        .where({ ...filter, createdAt: { gte: bucket.start, lt: bucket.end } })
        .aggregate({ deals: { count: 'value' }, value: { sum: 'value' } })
        .execute()
    )
  );

  return buckets.map((bucket, i) => {
    const totals = results[i][0]?.aggregations;
    return {
      monthStart: bucket.monthStart,
      label: bucket.label,
      deals: totals?.deals ?? 0,
      value: num(totals?.value),
    };
  });
}

/** Name lookup for owner ids — the rep roster is tiny compared with the deal table. */
async function fetchRepNames(): Promise<Map<string, string>> {
  const rows = await getRayfinClient()
    .data.SalesRep.select(['id', 'name'])
    .orderBy({ name: 'asc' })
    .first(500)
    .execute();
  return new Map(rows.map((row) => [String(row.id), row.name]));
}

async function runDashboardAggregates(scope?: DealScope): Promise<DashboardAggregates> {
  const filter = scopeFilter(scope);

  const [stageRollup, sourceCounts, ownerRollup, overTime, repNames] = await Promise.all([
    fetchStageRollup(filter),
    fetchSourceCounts(),
    fetchOwnerRollup(filter),
    fetchOverTime(12, filter),
    fetchRepNames(),
  ]);

  const stageCounts = stageCountsFromRollup(stageRollup);
  const newThisMonth = overTime.at(-1)?.deals ?? 0;

  return {
    kpis: kpisFromRollup(stageRollup, newThisMonth),
    stageCounts,
    funnel: cumulativeFunnel(stageCounts),
    sourceCounts,
    owners: ownerCountsFromRollup(ownerRollup, (id) => repNames.get(id) ?? '—'),
    overTime,
    wonCount: stageCounts.find((entry) => entry.stage === 'Won')?.count ?? 0,
    lostCount: stageCounts.find((entry) => entry.stage === 'Lost')?.count ?? 0,
  };
}

/** Aggregate the whole dashboard in SQL, timed as a `query` on the Metrics page. */
export function fetchDashboardAggregates(scope?: DealScope): Promise<DashboardAggregates> {
  return timed(
    'query',
    'Aggregate dashboard',
    () => runDashboardAggregates(scope),
    (data) =>
      data.stageCounts.length +
      data.sourceCounts.length +
      data.owners.length +
      data.overTime.length
  );
}

/** Per-rep quota attainment, rolled up in SQL and joined to the rep roster. */
export function fetchRepPerformance(reps: RepItem[]): Promise<RepPerformance[]> {
  return timed(
    'query',
    'Aggregate rep performance',
    async () => repPerformanceFromRollup(await fetchOwnerRollup(), reps),
    (rows) => rows.length
  );
}
