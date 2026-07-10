/**
 * Client-side types and constants for the CRM. The Rayfin entities live in
 * `rayfin/data`; these are the flattened, relationship-joined shapes the UI and
 * analytics consume after loading the workspace.
 */

// ---------------------------------------------------------------------------
// Enums / constants (kept in sync with the @set() decorators on the entities)
// ---------------------------------------------------------------------------

export const DEAL_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

/** Ordered funnel stages (excludes the terminal "Lost" state). */
export const PIPELINE_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
] as const;

/** Stages that still count as live, working pipeline. */
export const OPEN_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
] as const;

export const DEAL_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Event',
  'Partner',
] as const;

export type DealSource = (typeof DEAL_SOURCES)[number];

export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Media',
  'Energy',
  'Hospitality',
] as const;

export const ACCOUNT_TIERS = [
  'Strategic',
  'Enterprise',
  'Mid-Market',
  'SMB',
] as const;

export type AccountTier = (typeof ACCOUNT_TIERS)[number];

export const REP_REGIONS = [
  'North America',
  'EMEA',
  'APAC',
  'LATAM',
] as const;

export type RepRegion = (typeof REP_REGIONS)[number];

export const ACTIVITY_TYPES = [
  'Call',
  'Email',
  'Meeting',
  'Demo',
  'Note',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Flattened item shapes (relationships resolved to id + display fields)
// ---------------------------------------------------------------------------

export interface RepItem {
  id: string;
  name: string;
  email: string;
  title: string;
  region: RepRegion;
  quota: number;
  avatarColor: string;
  createdAt: Date;
}

export interface TagItem {
  id: string;
  label: string;
  color: string;
}

export interface AccountItem {
  id: string;
  name: string;
  industry: string;
  website: string;
  city: string;
  country: string;
  employeeCount: number;
  annualRevenue: number;
  tier: AccountTier;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
}

export interface ContactItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  accountId: string;
  accountName: string;
  createdAt: Date;
}

export interface DealItem {
  id: string;
  name: string;
  stage: DealStage;
  source: string;
  value: number;
  score: number;
  probability: number;
  expectedCloseDate: Date;
  closedAt: Date | null;
  createdAt: Date;
  accountId: string;
  accountName: string;
  industry: string;
  contactId: string | null;
  contactName: string | null;
  ownerId: string;
  ownerName: string;
  tagIds: string[];
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  occurredAt: Date;
  createdAt: Date;
  dealId: string;
  dealName: string;
  ownerId: string;
  ownerName: string;
}

/** Everything the app loads for the signed-in user in one bundle. */
export interface Workspace {
  reps: RepItem[];
  tags: TagItem[];
  accounts: AccountItem[];
  contacts: ContactItem[];
  deals: DealItem[];
  activities: ActivityItem[];
}

/** Payload for creating a deal from the UI. */
export interface NewDeal {
  name: string;
  stage: DealStage;
  source: string;
  value: number;
  score: number;
  probability: number;
  expectedCloseDate: Date;
  createdAt: Date;
  closedAt: Date | null;
  accountId: string;
  contactId: string | null;
  ownerId: string;
  tagIds: string[];
}

// ---------------------------------------------------------------------------
// Display metadata
// ---------------------------------------------------------------------------

export interface StageMeta {
  label: string;
  /** Hex used by graphein chart palettes. */
  color: string;
  /** Tailwind badge classes (kept as literals so Tailwind can detect them). */
  text: string;
  bg: string;
  dot: string;
}

export const STAGE_META: Record<string, StageMeta> = {
  New: { label: 'New', color: '#6366f1', text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/15', dot: 'bg-indigo-500' },
  Contacted: { label: 'Contacted', color: '#0ea5e9', text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/15', dot: 'bg-sky-500' },
  Qualified: { label: 'Qualified', color: '#14b8a6', text: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-500/15', dot: 'bg-teal-500' },
  Proposal: { label: 'Proposal', color: '#f59e0b', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/15', dot: 'bg-amber-500' },
  Negotiation: { label: 'Negotiation', color: '#a855f7', text: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-500/15', dot: 'bg-purple-500' },
  Won: { label: 'Won', color: '#22c55e', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-500/15', dot: 'bg-green-500' },
  Lost: { label: 'Lost', color: '#ef4444', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/15', dot: 'bg-rose-500' },
};

export function stageMeta(stage: string): StageMeta {
  return (
    STAGE_META[stage] ?? {
      label: stage,
      color: '#64748b',
      text: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-700/50',
      dot: 'bg-slate-500',
    }
  );
}

export interface TierMeta {
  text: string;
  bg: string;
}

export const TIER_META: Record<string, TierMeta> = {
  Strategic: { text: 'text-fuchsia-700 dark:text-fuchsia-300', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/15' },
  Enterprise: { text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/15' },
  'Mid-Market': { text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/15' },
  SMB: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/50' },
};

export function tierMeta(tier: string): TierMeta {
  return TIER_META[tier] ?? { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/50' };
}

export interface ActivityMeta {
  text: string;
  bg: string;
  dot: string;
  /** Hex used by graphein chart palettes. */
  color: string;
}

export const ACTIVITY_META: Record<string, ActivityMeta> = {
  Call: { text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/15', dot: 'bg-sky-500', color: '#0ea5e9' },
  Email: { text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/15', dot: 'bg-indigo-500', color: '#6366f1' },
  Meeting: { text: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-500/15', dot: 'bg-violet-500', color: '#8b5cf6' },
  Demo: { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/15', dot: 'bg-amber-500', color: '#f59e0b' },
  Note: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/50', dot: 'bg-slate-500', color: '#64748b' },
};

export function activityMeta(type: string): ActivityMeta {
  return (
    ACTIVITY_META[type] ?? {
      text: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-700/50',
      dot: 'bg-slate-500',
      color: '#64748b',
    }
  );
}

export function isOpen(stage: string): boolean {
  return (OPEN_STAGES as readonly string[]).includes(stage);
}

/** Default win-probability per stage; shared by seeding, stage moves and the UI. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  New: 10,
  Contacted: 22,
  Qualified: 40,
  Proposal: 60,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
};

export function defaultProbability(stage: DealStage): number {
  return STAGE_PROBABILITY[stage] ?? 0;
}

export function contactName(contact: Pick<ContactItem, 'firstName' | 'lastName'>): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}
