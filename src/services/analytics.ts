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

function asDate(value: Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-01`;
}

export function computeKpis(deals: DealItem[]): Kpis {
  let openDeals = 0;
  let pipelineValue = 0;
  let weightedPipeline = 0;
  let wonValue = 0;
  let lostValue = 0;
  let won = 0;
  let lost = 0;
  let scoreSum = 0;
  let newThisMonth = 0;

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  for (const deal of deals) {
    scoreSum += deal.score;
    if (isOpen(deal.stage)) {
      openDeals += 1;
      pipelineValue += deal.value;
      weightedPipeline += (deal.value * deal.probability) / 100;
    }
    if (deal.stage === 'Won') {
      won += 1;
      wonValue += deal.value;
    }
    if (deal.stage === 'Lost') {
      lost += 1;
      lostValue += deal.value;
    }
    const d = asDate(deal.createdAt);
    if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
      newThisMonth += 1;
    }
  }

  const decided = won + lost;
  return {
    totalDeals: deals.length,
    openDeals,
    pipelineValue,
    weightedPipeline,
    wonValue,
    lostValue,
    winRate: decided ? won / decided : 0,
    avgScore: deals.length ? Math.round(scoreSum / deals.length) : 0,
    newThisMonth,
  };
}

export function dealsByStage(deals: DealItem[]): StageCount[] {
  const map = new Map<string, StageCount>();
  for (const stage of DEAL_STAGES) {
    map.set(stage, { stage, count: 0, value: 0 });
  }
  for (const deal of deals) {
    const entry = map.get(deal.stage) ?? { stage: deal.stage, count: 0, value: 0 };
    entry.count += 1;
    entry.value += deal.value;
    map.set(deal.stage, entry);
  }
  return [...map.values()].filter((e) => e.count > 0);
}

/**
 * Cumulative pipeline funnel. Each stage counts every deal that has reached at
 * least that stage, so "New" equals the full deal count and later stages show
 * how many progressed that far — the funnel reads as a stage-to-stage
 * conversion rate. Lost deals (whose drop-off stage we don't track) count only
 * at the entry stage.
 */
export function pipelineByStage(deals: DealItem[]): StageCount[] {
  const rankOf = new Map<string, number>();
  PIPELINE_STAGES.forEach((stage, i) => rankOf.set(stage, i));

  const counts = PIPELINE_STAGES.map(() => ({ count: 0, value: 0 }));

  for (const deal of deals) {
    const reached = rankOf.get(deal.stage) ?? 0;
    for (let i = 0; i <= reached; i++) {
      counts[i].count += 1;
      counts[i].value += deal.value;
    }
  }

  return PIPELINE_STAGES.map((stage, i) => ({
    stage,
    count: counts[i].count,
    value: counts[i].value,
  }));
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
  const now = new Date();
  const buckets: OverTimePoint[] = [];
  const index = new Map<string, OverTimePoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const point: OverTimePoint = {
      monthStart: monthKey(d),
      label: d.toLocaleString('en-US', { month: 'short' }),
      deals: 0,
      value: 0,
    };
    buckets.push(point);
    index.set(point.monthStart, point);
  }

  for (const deal of deals) {
    const d = asDate(deal.createdAt);
    const point = index.get(monthKey(new Date(d.getFullYear(), d.getMonth(), 1)));
    if (point) {
      point.deals += 1;
      point.value += deal.value;
    }
  }

  return buckets;
}

export function topDeals(deals: DealItem[], n = 8): DealItem[] {
  return [...deals].sort((a, b) => b.value - a.value).slice(0, n);
}

/** Aggregate deal volume and value per owner, ranked by open pipeline value. */
export function dealsByOwner(deals: DealItem[]): OwnerCount[] {
  const map = new Map<string, OwnerCount>();
  for (const deal of deals) {
    const entry =
      map.get(deal.ownerId) ??
      { ownerId: deal.ownerId, ownerName: deal.ownerName, count: 0, pipelineValue: 0, wonValue: 0 };
    entry.count += 1;
    if (isOpen(deal.stage)) entry.pipelineValue += deal.value;
    if (deal.stage === 'Won') entry.wonValue += deal.value;
    map.set(deal.ownerId, entry);
  }
  return [...map.values()].sort((a, b) => b.pipelineValue - a.pipelineValue);
}

/** Per-rep quota attainment (won value ÷ quota), joined to the rep roster. */
export function repLeaderboard(deals: DealItem[], reps: RepItem[]): RepPerformance[] {
  const byOwner = new Map<
    string,
    { wonValue: number; pipelineValue: number; openCount: number; wonCount: number }
  >();
  for (const deal of deals) {
    const entry =
      byOwner.get(deal.ownerId) ?? { wonValue: 0, pipelineValue: 0, openCount: 0, wonCount: 0 };
    if (deal.stage === 'Won') {
      entry.wonValue += deal.value;
      entry.wonCount += 1;
    }
    if (isOpen(deal.stage)) {
      entry.pipelineValue += deal.value;
      entry.openCount += 1;
    }
    byOwner.set(deal.ownerId, entry);
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
