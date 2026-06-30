export interface LeadItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  industry: string;
  value: number;
  score: number;
  createdAt: Date;
}

export type NewLead = Omit<LeadItem, 'id'>;

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Ordered funnel stages (excludes the terminal "Lost" state). */
export const PIPELINE_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
] as const;

/** Statuses that still count as live, working pipeline. */
export const OPEN_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
] as const;

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Event',
  'Partner',
] as const;

export const LEAD_INDUSTRIES = [
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

export interface StatusMeta {
  label: string;
  /** Hex used by graphein chart palettes. */
  color: string;
  /** Tailwind badge classes (kept as literals so Tailwind can detect them). */
  text: string;
  bg: string;
  dot: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  New: { label: 'New', color: '#6366f1', text: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
  Contacted: { label: 'Contacted', color: '#0ea5e9', text: 'text-sky-700', bg: 'bg-sky-50', dot: 'bg-sky-500' },
  Qualified: { label: 'Qualified', color: '#14b8a6', text: 'text-teal-700', bg: 'bg-teal-50', dot: 'bg-teal-500' },
  Proposal: { label: 'Proposal', color: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  Negotiation: { label: 'Negotiation', color: '#a855f7', text: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  Won: { label: 'Won', color: '#22c55e', text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  Lost: { label: 'Lost', color: '#ef4444', text: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      color: '#64748b',
      text: 'text-slate-700',
      bg: 'bg-slate-100',
      dot: 'bg-slate-500',
    }
  );
}

export function isOpen(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}
