import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_INDUSTRIES,
  PIPELINE_STAGES,
  isOpen,
  type LeadItem,
} from './leadTypes';

export interface Kpis {
  totalLeads: number;
  openLeads: number;
  pipelineValue: number;
  wonValue: number;
  lostValue: number;
  winRate: number;
  avgScore: number;
  newThisMonth: number;
}

export interface StatusCount {
  status: string;
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

export interface StageCount {
  stage: string;
  count: number;
  value: number;
}

export interface OverTimePoint {
  monthStart: string;
  label: string;
  leads: number;
  value: number;
}

function asDate(value: Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-01`;
}

export function computeKpis(leads: LeadItem[]): Kpis {
  let openLeads = 0;
  let pipelineValue = 0;
  let wonValue = 0;
  let lostValue = 0;
  let won = 0;
  let lost = 0;
  let scoreSum = 0;
  let newThisMonth = 0;

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  for (const lead of leads) {
    scoreSum += lead.score;
    if (isOpen(lead.status)) {
      openLeads += 1;
      pipelineValue += lead.value;
    }
    if (lead.status === 'Won') {
      won += 1;
      wonValue += lead.value;
    }
    if (lead.status === 'Lost') {
      lost += 1;
      lostValue += lead.value;
    }
    const d = asDate(lead.createdAt);
    if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
      newThisMonth += 1;
    }
  }

  const decided = won + lost;
  return {
    totalLeads: leads.length,
    openLeads,
    pipelineValue,
    wonValue,
    lostValue,
    winRate: decided ? won / decided : 0,
    avgScore: leads.length ? Math.round(scoreSum / leads.length) : 0,
    newThisMonth,
  };
}

export function leadsByStatus(leads: LeadItem[]): StatusCount[] {
  const map = new Map<string, StatusCount>();
  for (const status of LEAD_STATUSES) {
    map.set(status, { status, count: 0, value: 0 });
  }
  for (const lead of leads) {
    const entry = map.get(lead.status) ?? { status: lead.status, count: 0, value: 0 };
    entry.count += 1;
    entry.value += lead.value;
    map.set(lead.status, entry);
  }
  return [...map.values()].filter((e) => e.count > 0);
}

/**
 * Cumulative pipeline funnel. Each stage counts every lead that has reached at
 * least that stage, so "New" equals the full lead count and later stages show
 * how many progressed that far — the funnel reads as a stage-to-stage
 * conversion rate. Leads still sitting at New, and lost leads (whose drop-off
 * stage we don't track), count only at the entry stage.
 */
export function pipelineByStage(leads: LeadItem[]): StageCount[] {
  const rankOf = new Map<string, number>();
  PIPELINE_STAGES.forEach((stage, i) => rankOf.set(stage, i));

  const counts = PIPELINE_STAGES.map(() => ({ count: 0, value: 0 }));

  for (const lead of leads) {
    const reached = rankOf.get(lead.status) ?? 0;
    for (let i = 0; i <= reached; i++) {
      counts[i].count += 1;
      counts[i].value += lead.value;
    }
  }

  return PIPELINE_STAGES.map((stage, i) => ({
    stage,
    count: counts[i].count,
    value: counts[i].value,
  }));
}

export function leadsBySource(leads: LeadItem[]): SourceCount[] {
  const map = new Map<string, number>();
  for (const source of LEAD_SOURCES) map.set(source, 0);
  for (const lead of leads) {
    map.set(lead.source, (map.get(lead.source) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function leadsByIndustry(leads: LeadItem[]): IndustryCount[] {
  const map = new Map<string, number>();
  for (const industry of LEAD_INDUSTRIES) map.set(industry, 0);
  for (const lead of leads) {
    map.set(lead.industry, (map.get(lead.industry) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([industry, count]) => ({ industry, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function leadsOverTime(leads: LeadItem[], months = 12): OverTimePoint[] {
  const now = new Date();
  const buckets: OverTimePoint[] = [];
  const index = new Map<string, OverTimePoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const point: OverTimePoint = {
      monthStart: monthKey(d),
      label: d.toLocaleString('en-US', { month: 'short' }),
      leads: 0,
      value: 0,
    };
    buckets.push(point);
    index.set(point.monthStart, point);
  }

  for (const lead of leads) {
    const d = asDate(lead.createdAt);
    const point = index.get(monthKey(new Date(d.getFullYear(), d.getMonth(), 1)));
    if (point) {
      point.leads += 1;
      point.value += lead.value;
    }
  }

  return buckets;
}

export function topLeads(leads: LeadItem[], n = 8): LeadItem[] {
  return [...leads].sort((a, b) => b.value - a.value).slice(0, n);
}
