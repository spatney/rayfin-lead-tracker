import {
  DEAL_SOURCES,
  DEAL_STAGES,
  INDUSTRIES,
  PIPELINE_STAGES,
  isOpen,
  type AccountItem,
  type ActivityItem,
  type DealItem,
  type RepItem,
} from './crmTypes';

export interface Kpis {
  totalDeals: number;
  openDeals: number;
  pipelineValue: number;
  weightedPipeline: number;
  wonValue: number;
  lostValue: number;
  winRate: number;
  avgScore: number;
  newThisMonth: number;
}

export interface StageCount {
  stage: string;
  count: number;
  value: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface IndustryCount {
  industry: string;
  count: number;
}

export interface OverTimePoint {
  monthStart: string;
  label: string;
  deals: number;
  value: number;
}

export interface OwnerCount {
  ownerId: string;
  ownerName: string;
  count: number;
  pipelineValue: number;
  wonValue: number;
}

export interface RepPerformance {
  rep: RepItem;
  wonValue: number;
  pipelineValue: number;
  openCount: number;
  wonCount: number;
  attainment: number;
}

export interface AccountValue {
  accountId: string;
  accountName: string;
  industry: string;
  dealCount: number;
  openValue: number;
  wonValue: number;
  totalValue: number;
}

export interface ActivityTypeCount {
  type: string;
  count: number;
}

/**
 * A pre-summarised deal bucket. Both paths produce this shape — the client-side
 * path by folding rows, the server-side path from a
 * `groupBy(['stage', 'probability'])` aggregation — so all the rollup maths
 * below has exactly one implementation.
 */
export interface StageRollup {
  stage: string;
  /** Win probability, carried so weighted pipeline stays exact without row access. */
  probability: number;
  count: number;
  value: number;
  scoreSum: number;
}

/** A pre-summarised (owner, stage) bucket, shared by both paths. */
export interface OwnerStageRollup {
  ownerId: string;
  stage: string;
  count: number;
  value: number;
}

/** One month of the trailing window, with the half-open range that defines it. */
export interface MonthBucket {
  monthStart: string;
  label: string;
  /** Inclusive lower bound. */
  start: Date;
  /** Exclusive upper bound. */
  end: Date;
}

function asDate(value: Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-01`;
}

/** The trailing `months` calendar months, oldest first, ending with the current one. */
export function monthBuckets(months = 12, now = new Date()): MonthBucket[] {
  return Array.from({ length: months }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      monthStart: monthKey(start),
      label: start.toLocaleString('en-US', { month: 'short' }),
      start,
      end,
    };
  });
}

/** Fold deals into the neutral (stage, probability) rollup shape. */
export function stageRollupFromDeals(deals: DealItem[]): StageRollup[] {
  const map = new Map<string, StageRollup>();
  for (const deal of deals) {
    const key = `${deal.stage}|${deal.probability}`;
    const entry =
      map.get(key) ??
      { stage: deal.stage, probability: deal.probability, count: 0, value: 0, scoreSum: 0 };
    entry.count += 1;
    entry.value += deal.value;
    entry.scoreSum += deal.score;
    map.set(key, entry);
  }
  return [...map.values()];
}

/** Fold deals into the neutral (owner, stage) rollup shape. */
export function ownerStageRollupFromDeals(deals: DealItem[]): OwnerStageRollup[] {
  const map = new Map<string, OwnerStageRollup>();
  for (const deal of deals) {
    const key = `${deal.ownerId}|${deal.stage}`;
    const entry = map.get(key) ?? { ownerId: deal.ownerId, stage: deal.stage, count: 0, value: 0 };
    entry.count += 1;
    entry.value += deal.value;
    map.set(key, entry);
  }
  return [...map.values()];
}

/**
 * Derive every headline KPI from stage rollups. `newThisMonth` cannot be read
 * from a stage grouping, so it is supplied by the caller (the trailing-12-month
 * series already carries it).
 */
export function kpisFromRollup(rows: StageRollup[], newThisMonth: number): Kpis {
  let totalDeals = 0;
  let openDeals = 0;
  let pipelineValue = 0;
  let weightedPipeline = 0;
  let wonValue = 0;
  let lostValue = 0;
  let won = 0;
  let lost = 0;
  let scoreSum = 0;

  for (const row of rows) {
    totalDeals += row.count;
    scoreSum += row.scoreSum;
    if (isOpen(row.stage)) {
      openDeals += row.count;
      pipelineValue += row.value;
      weightedPipeline += (row.value * row.probability) / 100;
    }
    if (row.stage === 'Won') {
      won += row.count;
      wonValue += row.value;
    }
    if (row.stage === 'Lost') {
      lost += row.count;
      lostValue += row.value;
    }
  }

  const decided = won + lost;
  return {
    totalDeals,
    openDeals,
    pipelineValue,
    weightedPipeline,
    wonValue,
    lostValue,
    winRate: decided ? won / decided : 0,
    avgScore: totalDeals ? Math.round(scoreSum / totalDeals) : 0,
    newThisMonth,
  };
}

/** Collapse stage rollups to one entry per stage, in pipeline order. */
export function stageCountsFromRollup(rows: StageRollup[]): StageCount[] {
  const map = new Map<string, StageCount>();
  for (const stage of DEAL_STAGES) {
    map.set(stage, { stage, count: 0, value: 0 });
  }
  for (const row of rows) {
    const entry = map.get(row.stage) ?? { stage: row.stage, count: 0, value: 0 };
    entry.count += row.count;
    entry.value += row.value;
    map.set(row.stage, entry);
  }
  return [...map.values()].filter((e) => e.count > 0);
}

/**
 * Turn per-stage counts into the cumulative funnel described on
 * {@link pipelineByStage}: each stage carries every deal that reached at least
 * that far.
 */
export function cumulativeFunnel(stageCounts: StageCount[]): StageCount[] {
  const rankOf = new Map<string, number>();
  PIPELINE_STAGES.forEach((stage, i) => rankOf.set(stage, i));

  const counts = PIPELINE_STAGES.map(() => ({ count: 0, value: 0 }));
  for (const entry of stageCounts) {
    const reached = rankOf.get(entry.stage) ?? 0;
    for (let i = 0; i <= reached; i++) {
      counts[i].count += entry.count;
      counts[i].value += entry.value;
    }
  }

  return PIPELINE_STAGES.map((stage, i) => ({
    stage,
    count: counts[i].count,
    value: counts[i].value,
  }));
}

/** Roll (owner, stage) buckets up to one ranked row per owner. */
export function ownerCountsFromRollup(
  rows: OwnerStageRollup[],
  nameOf: (ownerId: string) => string
): OwnerCount[] {
  const map = new Map<string, OwnerCount>();
  for (const row of rows) {
    const entry =
      map.get(row.ownerId) ??
      {
        ownerId: row.ownerId,
        ownerName: nameOf(row.ownerId),
        count: 0,
        pipelineValue: 0,
        wonValue: 0,
      };
    entry.count += row.count;
    if (isOpen(row.stage)) entry.pipelineValue += row.value;
    if (row.stage === 'Won') entry.wonValue += row.value;
    map.set(row.ownerId, entry);
  }
  return [...map.values()].sort((a, b) => b.pipelineValue - a.pipelineValue);
}

/** Join (owner, stage) buckets to the rep roster and rank by quota attainment. */
export function repPerformanceFromRollup(
  rows: OwnerStageRollup[],
  reps: RepItem[]
): RepPerformance[] {
  const byOwner = new Map<
    string,
    { wonValue: number; pipelineValue: number; openCount: number; wonCount: number }
  >();
  for (const row of rows) {
    const entry =
      byOwner.get(row.ownerId) ?? { wonValue: 0, pipelineValue: 0, openCount: 0, wonCount: 0 };
    if (row.stage === 'Won') {
      entry.wonValue += row.value;
      entry.wonCount += row.count;
    }
    if (isOpen(row.stage)) {
      entry.pipelineValue += row.value;
      entry.openCount += row.count;
    }
    byOwner.set(row.ownerId, entry);
  }

  return reps
    .map((rep) => {
      const stats =
        byOwner.get(rep.id) ?? { wonValue: 0, pipelineValue: 0, openCount: 0, wonCount: 0 };
      return {
        rep,
        wonValue: stats.wonValue,
        pipelineValue: stats.pipelineValue,
        openCount: stats.openCount,
        wonCount: stats.wonCount,
        attainment: rep.quota > 0 ? stats.wonValue / rep.quota : 0,
      };
    })
    .sort((a, b) => b.attainment - a.attainment);
}

export function computeKpis(deals: DealItem[]): Kpis {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  let newThisMonth = 0;
  for (const deal of deals) {
    const d = asDate(deal.createdAt);
    if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
      newThisMonth += 1;
    }
  }

  return kpisFromRollup(stageRollupFromDeals(deals), newThisMonth);
}

export function dealsByStage(deals: DealItem[]): StageCount[] {
  return stageCountsFromRollup(stageRollupFromDeals(deals));
}

/**
 * Cumulative pipeline funnel. Each stage counts every deal that has reached at
 * least that stage, so "New" equals the full deal count and later stages show
 * how many progressed that far — the funnel reads as a stage-to-stage
 * conversion rate. Lost deals (whose drop-off stage we don't track) count only
 * at the entry stage.
 */
export function pipelineByStage(deals: DealItem[]): StageCount[] {
  return cumulativeFunnel(dealsByStage(deals));
}

export function dealsBySource(deals: DealItem[]): SourceCount[] {
  const map = new Map<string, number>();
  for (const source of DEAL_SOURCES) map.set(source, 0);
  for (const deal of deals) {
    map.set(deal.source, (map.get(deal.source) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function dealsByIndustry(deals: DealItem[]): IndustryCount[] {
  const map = new Map<string, number>();
  for (const industry of INDUSTRIES) map.set(industry, 0);
  for (const deal of deals) {
    map.set(deal.industry, (map.get(deal.industry) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([industry, count]) => ({ industry, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function dealsOverTime(deals: DealItem[], months = 12): OverTimePoint[] {
  const points: OverTimePoint[] = monthBuckets(months).map((bucket) => ({
    monthStart: bucket.monthStart,
    label: bucket.label,
    deals: 0,
    value: 0,
  }));
  const index = new Map(points.map((point) => [point.monthStart, point]));

  for (const deal of deals) {
    const d = asDate(deal.createdAt);
    const point = index.get(monthKey(new Date(d.getFullYear(), d.getMonth(), 1)));
    if (point) {
      point.deals += 1;
      point.value += deal.value;
    }
  }

  return points;
}

export function topDeals(deals: DealItem[], n = 8): DealItem[] {
  return [...deals].sort((a, b) => b.value - a.value).slice(0, n);
}

/** Aggregate deal volume and value per owner, ranked by open pipeline value. */
export function dealsByOwner(deals: DealItem[]): OwnerCount[] {
  const nameOf = new Map(deals.map((deal) => [deal.ownerId, deal.ownerName]));
  return ownerCountsFromRollup(
    ownerStageRollupFromDeals(deals),
    (ownerId) => nameOf.get(ownerId) ?? '—'
  );
}

/** Per-rep quota attainment (won value ÷ quota), joined to the rep roster. */
export function repLeaderboard(deals: DealItem[], reps: RepItem[]): RepPerformance[] {
  return repPerformanceFromRollup(ownerStageRollupFromDeals(deals), reps);
}

/** Roll deal value up to accounts, ranked by total value. */
export function topAccounts(
  deals: DealItem[],
  accounts: AccountItem[],
  n = 8
): AccountValue[] {
  const industryOf = new Map(accounts.map((a) => [a.id, a.industry]));
  const map = new Map<string, AccountValue>();

  for (const deal of deals) {
    const entry =
      map.get(deal.accountId) ??
      {
        accountId: deal.accountId,
        accountName: deal.accountName,
        industry: industryOf.get(deal.accountId) ?? deal.industry,
        dealCount: 0,
        openValue: 0,
        wonValue: 0,
        totalValue: 0,
      };
    entry.dealCount += 1;
    entry.totalValue += deal.value;
    if (isOpen(deal.stage)) entry.openValue += deal.value;
    if (deal.stage === 'Won') entry.wonValue += deal.value;
    map.set(deal.accountId, entry);
  }

  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue).slice(0, n);
}

export function activityByType(activities: ActivityItem[]): ActivityTypeCount[] {
  const map = new Map<string, number>();
  for (const activity of activities) {
    map.set(activity.type, (map.get(activity.type) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function recentActivities(activities: ActivityItem[], n = 8): ActivityItem[] {
  return [...activities]
    .sort((a, b) => asDate(b.occurredAt).getTime() - asDate(a.occurredAt).getTime())
    .slice(0, n);
}
