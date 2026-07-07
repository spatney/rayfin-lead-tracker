import {
  ACTIVITY_TYPES,
  DEAL_SOURCES,
  DEAL_STAGES,
  INDUSTRIES,
  type AccountTier,
  type ActivityType,
  type DealSource,
  type DealStage,
  type RepRegion,
} from './crmTypes';

// ---------------------------------------------------------------------------
// Index-referenced specs. The generator is pure (no network); crm.ts inserts
// each phase in dependency order, capturing the returned ids and resolving the
// *Index references into real foreign keys.
// ---------------------------------------------------------------------------

export interface RepSpec {
  name: string;
  email: string;
  title: string;
  region: RepRegion;
  quota: number;
  avatarColor: string;
  createdAt: Date;
}

export interface TagSpec {
  label: string;
  color: string;
  createdAt: Date;
}

export interface AccountSpec {
  name: string;
  industry: string;
  website: string;
  city: string;
  country: string;
  employeeCount: number;
  annualRevenue: number;
  tier: AccountTier;
  ownerIndex: number;
  createdAt: Date;
}

export interface ContactSpec {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  accountIndex: number;
  createdAt: Date;
}

export interface DealSpec {
  name: string;
  stage: DealStage;
  source: DealSource;
  value: number;
  score: number;
  probability: number;
  expectedCloseDate: Date;
  closedAt: Date | null;
  accountIndex: number;
  contactIndex: number | null;
  ownerIndex: number;
  tagIndexes: number[];
  createdAt: Date;
}

export interface ActivitySpec {
  type: ActivityType;
  subject: string;
  notes: string | null;
  occurredAt: Date;
  dealIndex: number;
  ownerIndex: number;
  createdAt: Date;
}

export interface SampleGraph {
  reps: RepSpec[];
  tags: TagSpec[];
  accounts: AccountSpec[];
  contacts: ContactSpec[];
  deals: DealSpec[];
  activities: ActivitySpec[];
}

export function totalRecords(graph: SampleGraph): number {
  return (
    graph.reps.length +
    graph.tags.length +
    graph.accounts.length +
    graph.contacts.length +
    graph.deals.length +
    graph.activities.length +
    graph.deals.reduce((sum, d) => sum + d.tagIndexes.length, 0)
  );
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Logan', 'Amelia', 'Elijah', 'Harper', 'James',
  'Evelyn', 'Benjamin', 'Aria', 'Henry', 'Priya', 'Daniel', 'Layla', 'Mateo',
  'Chloe', 'Sebastian', 'Nora', 'Aiden', 'Zoe', 'Kai', 'Maya', 'Omar',
  'Lena', 'Diego', 'Ruth', 'Hassan', 'Grace', 'Ivan', 'Sofia', 'Theo',
];

const LAST_NAMES = [
  'Carter', 'Nguyen', 'Patel', 'Reyes', 'Khan', 'Bennett', 'Morales', 'Foster',
  'Sullivan', 'Ramirez', 'Cohen', 'Okafor', 'Schmidt', 'Lindqvist', 'Romano',
  'Walsh', 'Delgado', 'Petrov', 'Andersson', 'Mensah', 'Park', 'Russo', 'Hayes',
  'Fischer', 'Costa', 'Abboud', 'Larsen', 'Yamamoto', 'Brooks', 'Novak',
  'Singh', 'Mwangi', 'Greco', 'Holloway', 'Tan', 'Ferreira',
];

const COMPANY_ROOTS = [
  'Nimbus', 'Apex', 'Vertex', 'Quantum', 'Solstice', 'Atlas', 'Beacon',
  'Cobalt', 'Drift', 'Ember', 'Forge', 'Granite', 'Halcyon', 'Ionic',
  'Juniper', 'Kepler', 'Lumen', 'Meridian', 'Nova', 'Onyx', 'Pinnacle',
  'Quartz', 'Ridge', 'Summit', 'Tundra', 'Umbra', 'Vela', 'Willow',
  'Xenon', 'Zephyr', 'Cinder', 'Harbor', 'Orbit', 'Cedar', 'Vantage', 'Polar',
];

const COMPANY_SUFFIXES = [
  'Labs', 'Systems', 'Group', 'Technologies', 'Industries', 'Partners',
  'Solutions', 'Dynamics', 'Networks', 'Digital', 'Ventures', 'Analytics',
  'Health', 'Logistics', 'Studios', 'Capital',
];

const CITIES: readonly (readonly [string, string])[] = [
  ['San Francisco', 'United States'],
  ['New York', 'United States'],
  ['Austin', 'United States'],
  ['Chicago', 'United States'],
  ['Toronto', 'Canada'],
  ['London', 'United Kingdom'],
  ['Berlin', 'Germany'],
  ['Paris', 'France'],
  ['Amsterdam', 'Netherlands'],
  ['Stockholm', 'Sweden'],
  ['Dublin', 'Ireland'],
  ['Singapore', 'Singapore'],
  ['Sydney', 'Australia'],
  ['Tokyo', 'Japan'],
  ['Bengaluru', 'India'],
  ['Sao Paulo', 'Brazil'],
  ['Mexico City', 'Mexico'],
  ['Dubai', 'United Arab Emirates'],
];

const CONTACT_TITLES = [
  'VP Engineering', 'CTO', 'Head of Ops', 'Procurement Lead', 'CFO',
  'Director of IT', 'Product Manager', 'VP Sales', 'COO', 'Head of Data',
  'Founder', 'CISO', 'VP Marketing', 'Operations Manager', 'Program Director',
];

const DEAL_NOUNS = [
  'Platform License', 'Annual Renewal', 'Expansion', 'Pilot Program',
  'Enterprise Rollout', 'Support Contract', 'Professional Services',
  'Data Migration', 'Add-on Modules', 'Multi-year Deal', 'Seat Upgrade',
  'Security Package',
];

const REPS: readonly Omit<RepSpec, 'createdAt'>[] = [
  { name: 'Dana Whitfield', email: 'dana.whitfield@leadflow.io', title: 'Account Executive', region: 'North America', quota: 1_200_000, avatarColor: '#6366f1' },
  { name: 'Marco Bianchi', email: 'marco.bianchi@leadflow.io', title: 'Senior AE', region: 'EMEA', quota: 1_500_000, avatarColor: '#0ea5e9' },
  { name: 'Aisha Rahman', email: 'aisha.rahman@leadflow.io', title: 'Enterprise AE', region: 'APAC', quota: 1_800_000, avatarColor: '#14b8a6' },
  { name: 'Tom Becker', email: 'tom.becker@leadflow.io', title: 'Account Executive', region: 'North America', quota: 1_100_000, avatarColor: '#f59e0b' },
  { name: 'Sofia Marin', email: 'sofia.marin@leadflow.io', title: 'Regional AE', region: 'LATAM', quota: 900_000, avatarColor: '#a855f7' },
  { name: 'Grace Lin', email: 'grace.lin@leadflow.io', title: 'Enterprise AE', region: 'APAC', quota: 1_650_000, avatarColor: '#fb7185' },
];

const TAGS: readonly Omit<TagSpec, 'createdAt'>[] = [
  { label: 'Hot', color: '#ef4444' },
  { label: 'Champion', color: '#22c55e' },
  { label: 'Budget approved', color: '#0ea5e9' },
  { label: 'Renewal', color: '#a855f7' },
  { label: 'Upsell', color: '#f59e0b' },
  { label: 'Competitor', color: '#f97316' },
  { label: 'Referral', color: '#14b8a6' },
  { label: 'At risk', color: '#e11d48' },
  { label: 'Fast-track', color: '#6366f1' },
  { label: 'Strategic', color: '#8b5cf6' },
];

const STAGE_WEIGHTS: readonly (readonly [DealStage, number])[] = [
  ['New', 24],
  ['Contacted', 20],
  ['Qualified', 16],
  ['Proposal', 12],
  ['Negotiation', 9],
  ['Won', 11],
  ['Lost', 8],
];

const SOURCE_WEIGHTS: readonly (readonly [DealSource, number])[] = [
  ['Website', 28],
  ['Referral', 18],
  ['Email Campaign', 14],
  ['Social Media', 13],
  ['Cold Call', 11],
  ['Event', 9],
  ['Partner', 7],
];

const TIER_WEIGHTS: readonly (readonly [AccountTier, number])[] = [
  ['SMB', 34],
  ['Mid-Market', 33],
  ['Enterprise', 25],
  ['Strategic', 8],
];

const ACTIVITY_WEIGHTS: readonly (readonly [ActivityType, number])[] = [
  ['Email', 34],
  ['Call', 28],
  ['Meeting', 16],
  ['Note', 14],
  ['Demo', 8],
];

const STAGE_SCORE: Record<DealStage, number> = {
  New: 34,
  Contacted: 47,
  Qualified: 60,
  Proposal: 71,
  Negotiation: 82,
  Won: 93,
  Lost: 26,
};

const STAGE_PROBABILITY: Record<DealStage, number> = {
  New: 10,
  Contacted: 22,
  Qualified: 40,
  Proposal: 60,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
};

const TIER_EMPLOYEES: Record<AccountTier, readonly [number, number]> = {
  SMB: [12, 180],
  'Mid-Market': [180, 900],
  Enterprise: [900, 6000],
  Strategic: [6000, 45000],
};

const ACTIVITY_SUBJECTS: Record<ActivityType, readonly string[]> = {
  Call: ['Discovery call', 'Follow-up call', 'Check-in call', 'Pricing discussion'],
  Email: ['Sent proposal', 'Intro email', 'Follow-up email', 'Shared case study'],
  Meeting: ['Kickoff meeting', 'Stakeholder review', 'Quarterly business review', 'Contract review'],
  Demo: ['Product demo', 'Technical deep-dive', 'Executive demo'],
  Note: ['Logged requirements', 'Budget confirmed', 'Competitor mentioned', 'Next steps captured'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

export interface SampleOptions {
  accounts?: number;
  dealsPerAccount?: number;
}

/**
 * Build a coherent, richly-related sample workspace. Pure (no network): used by
 * the "Generate sample data" action. Deal `createdAt` is biased toward recent
 * months so the trend reads like a growing book of business.
 */
export function buildSampleGraph(options: SampleOptions = {}): SampleGraph {
  const now = Date.now();
  const accountCount = options.accounts ?? 48;
  const dealsPerAccount = options.dealsPerAccount ?? 5;

  const reps: RepSpec[] = REPS.map((rep) => ({
    ...rep,
    createdAt: new Date(now - randInt(400, 900) * DAY_MS),
  }));

  const tags: TagSpec[] = TAGS.map((tag) => ({
    ...tag,
    createdAt: new Date(now - randInt(200, 800) * DAY_MS),
  }));

  // Accounts ---------------------------------------------------------------
  const usedNames = new Set<string>();
  const accounts: AccountSpec[] = [];
  const accountSlugs: string[] = [];

  for (let i = 0; i < accountCount; i++) {
    let name = '';
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = `${pick(COMPANY_ROOTS)} ${pick(COMPANY_SUFFIXES)}`;
      if (!usedNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) name = `${pick(COMPANY_ROOTS)} ${pick(COMPANY_SUFFIXES)} ${i}`;
    usedNames.add(name);

    const slug = slugify(name);
    accountSlugs.push(slug);

    const tier = weighted(TIER_WEIGHTS);
    const [empMin, empMax] = TIER_EMPLOYEES[tier];
    const employeeCount = randInt(empMin, empMax);
    const annualRevenue = employeeCount * randInt(120, 320) * 1000;
    const [city, country] = pick(CITIES);

    accounts.push({
      name,
      industry: pick(INDUSTRIES),
      website: `www.${slug}.com`,
      city,
      country,
      employeeCount,
      annualRevenue,
      tier,
      ownerIndex: randInt(0, reps.length - 1),
      createdAt: new Date(now - randInt(30, 720) * DAY_MS),
    });
  }

  // Contacts ---------------------------------------------------------------
  const contacts: ContactSpec[] = [];
  // Contact indexes grouped by account, so deals can attach a real contact.
  const contactsByAccount: number[][] = accounts.map(() => []);

  accounts.forEach((account, accountIndex) => {
    const count = randInt(2, 4);
    for (let c = 0; c < count; c++) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const slug = accountSlugs[accountIndex];
      contactsByAccount[accountIndex].push(contacts.length);
      contacts.push({
        firstName: first,
        lastName: last,
        email: `${first}.${last}@${slug}.com`.toLowerCase(),
        phone: `+1 (${randInt(200, 989)}) ${randInt(200, 989)}-${String(randInt(0, 9999)).padStart(4, '0')}`,
        title: pick(CONTACT_TITLES),
        accountIndex,
        createdAt: new Date(account.createdAt.getTime() + randInt(0, 20) * DAY_MS),
      });
    }
  });

  // Deals ------------------------------------------------------------------
  const deals: DealSpec[] = [];
  const targetDeals = accountCount * dealsPerAccount;

  for (let i = 0; i < targetDeals; i++) {
    const accountIndex = randInt(0, accounts.length - 1);
    const account = accounts[accountIndex];
    const accountContacts = contactsByAccount[accountIndex];
    const contactIndex =
      accountContacts.length > 0 && Math.random() > 0.12
        ? pick(accountContacts)
        : null;
    // Deals are usually owned by the account owner, sometimes another rep.
    const ownerIndex =
      Math.random() > 0.25 ? account.ownerIndex : randInt(0, reps.length - 1);

    const stage = weighted(STAGE_WEIGHTS);
    const source = weighted(SOURCE_WEIGHTS);
    const score = clamp(Math.round(STAGE_SCORE[stage] + randInt(-14, 14)), 1, 100);
    const probability = clamp(
      Math.round(
        STAGE_PROBABILITY[stage] +
          (stage === 'Won' || stage === 'Lost' ? 0 : randInt(-8, 8))
      ),
      0,
      100
    );

    const base = randInt(4, 240) * 1000;
    const tierBoost =
      account.tier === 'Strategic'
        ? 2.4
        : account.tier === 'Enterprise'
          ? 1.7
          : account.tier === 'Mid-Market'
            ? 1.15
            : 0.8;
    const value = Math.round((base * tierBoost * (0.6 + score / 140)) / 500) * 500;

    const daysAgo = Math.floor(Math.pow(Math.random(), 1.7) * 360);
    const createdAt = new Date(now - daysAgo * DAY_MS - randInt(0, DAY_MS));
    const expectedCloseDate = new Date(createdAt.getTime() + randInt(20, 120) * DAY_MS);
    const closedAt =
      stage === 'Won' || stage === 'Lost'
        ? new Date(createdAt.getTime() + randInt(10, Math.max(11, daysAgo)) * DAY_MS)
        : null;

    // 1-3 distinct tags
    const tagCount = randInt(1, 3);
    const tagIndexes: number[] = [];
    for (let t = 0; t < tagCount; t++) {
      const idx = randInt(0, tags.length - 1);
      if (!tagIndexes.includes(idx)) tagIndexes.push(idx);
    }

    deals.push({
      name: `${account.name} - ${pick(DEAL_NOUNS)}`,
      stage,
      source,
      value,
      score,
      probability,
      expectedCloseDate,
      closedAt,
      accountIndex,
      contactIndex,
      ownerIndex,
      tagIndexes,
      createdAt,
    });
  }

  // Activities -------------------------------------------------------------
  const activities: ActivitySpec[] = [];
  deals.forEach((deal, dealIndex) => {
    const count = randInt(1, 4);
    for (let a = 0; a < count; a++) {
      const type = weighted(ACTIVITY_WEIGHTS);
      const spanMs = Math.max(DAY_MS, now - deal.createdAt.getTime());
      const occurredAt = new Date(deal.createdAt.getTime() + Math.random() * spanMs);
      activities.push({
        type,
        subject: pick(ACTIVITY_SUBJECTS[type]),
        notes: Math.random() > 0.5 ? `${type} logged for ${deal.name}.` : null,
        occurredAt,
        dealIndex,
        ownerIndex: deal.ownerIndex,
        createdAt: occurredAt,
      });
    }
  });

  return { reps, tags, accounts, contacts, deals, activities };
}

/**
 * A single random set of scalar deal values (no relationships) for the
 * "auto-fill" button in the add-deal modal.
 */
export function buildSampleDealScalars() {
  const stage = weighted(STAGE_WEIGHTS);
  const source = weighted(SOURCE_WEIGHTS);
  const score = clamp(Math.round(STAGE_SCORE[stage] + randInt(-14, 14)), 1, 100);
  const probability = clamp(STAGE_PROBABILITY[stage], 0, 100);
  const value = Math.round((randInt(8, 220) * 1000 * (0.6 + score / 140)) / 500) * 500;
  return {
    name: `${pick(COMPANY_ROOTS)} ${pick(DEAL_NOUNS)}`,
    stage: stage as DealStage,
    source: source as DealSource,
    value,
    score,
    probability,
  };
}

export { DEAL_STAGES, DEAL_SOURCES, ACTIVITY_TYPES };
