import {
  LEAD_INDUSTRIES,
  type LeadStatus,
  type NewLead,
} from './leadTypes';

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
  'Xenon', 'Zephyr', 'Cinder', 'Harbor',
];

const COMPANY_SUFFIXES = [
  'Labs', 'Systems', 'Group', 'Technologies', 'Industries', 'Partners',
  'Solutions', 'Dynamics', 'Networks', 'Digital', 'Ventures', 'Analytics',
  'Health', 'Logistics', 'Studios', 'Capital',
];

const STATUS_WEIGHTS: readonly (readonly [LeadStatus, number])[] = [
  ['New', 26],
  ['Contacted', 21],
  ['Qualified', 16],
  ['Proposal', 12],
  ['Negotiation', 9],
  ['Won', 8],
  ['Lost', 8],
];

const SOURCE_WEIGHTS: readonly (readonly [string, number])[] = [
  ['Website', 28],
  ['Referral', 18],
  ['Email Campaign', 14],
  ['Social Media', 13],
  ['Cold Call', 11],
  ['Event', 9],
  ['Partner', 7],
];

const STAGE_SCORE: Record<string, number> = {
  New: 34,
  Contacted: 47,
  Qualified: 60,
  Proposal: 71,
  Negotiation: 82,
  Won: 93,
  Lost: 26,
};

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

const DAY_MS = 86_400_000;

/**
 * Generate `count` realistic, varied sample leads. Pure (no network): used both
 * by the "Generate sample data" action and by headless chart validation.
 * createdAt is biased toward recent months so the trend reads like a growing book.
 */
export function buildSampleLeads(count: number): NewLead[] {
  const now = Date.now();
  const leads: NewLead[] = [];

  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const root = pick(COMPANY_ROOTS);
    const suffix = pick(COMPANY_SUFFIXES);
    const company = `${root} ${suffix}`;
    const slug = `${root}${suffix}`.toLowerCase().replace(/[^a-z0-9]/g, '');

    const status = weighted(STATUS_WEIGHTS);
    const source = weighted(SOURCE_WEIGHTS);
    const industry = pick(LEAD_INDUSTRIES);

    const score = clamp(Math.round(STAGE_SCORE[status] + randInt(-14, 14)), 1, 100);
    const base = randInt(4, 240) * 1000;
    const value = Math.round((base * (0.6 + score / 140)) / 500) * 500;

    const daysAgo = Math.floor(Math.pow(Math.random(), 1.7) * 360);
    const createdAt = new Date(now - daysAgo * DAY_MS - randInt(0, DAY_MS));

    const email = `${first}.${last}@${slug}.com`.toLowerCase();
    const phone = `+1 (${randInt(200, 989)}) ${randInt(200, 989)}-${String(
      randInt(0, 9999)
    ).padStart(4, '0')}`;

    leads.push({
      name: `${first} ${last}`,
      company,
      email,
      phone,
      status,
      source,
      industry,
      value,
      score,
      createdAt,
    });
  }

  return leads;
}
