import { useEffect, useMemo, useState } from 'react';

import { ClearLeadsButton, GenerateLeadsButton } from '@/components/leadActions';
import {
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons';
import { PageHeader, ScorePill } from '@/components/ui';
import { useLeads } from '@/hooks/LeadsContext';
import {
  LEAD_INDUSTRIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  statusMeta,
  type LeadItem,
  type NewLead,
} from '@/services/leadTypes';
import { createLead, deleteLead, updateLead } from '@/services/leads';
import { formatCurrency, formatNumber, relativeTime } from '@/services/format';

const PAGE_SIZE = 12;

const fieldBase =
  'rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: string) => void;
}) {
  const meta = statusMeta(value);
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 ${meta.bg} ${meta.text}`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-slate-700">
            {s}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  allLabel: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} w-full cursor-pointer appearance-none py-2.5 pl-3.5 pr-9 sm:w-44`}
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

interface AddLeadModalProps {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

function AddLeadModal({ onClose, onCreated }: AddLeadModalProps) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'New',
    source: 'Website',
    industry: 'Technology',
    value: '10000',
    score: '60',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.company.trim()) {
      setError('Name and company are required.');
      return;
    }
    setBusy(true);
    setError(null);
    const lead: NewLead = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      source: form.source,
      industry: form.industry,
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      score: Math.min(100, Math.max(0, Math.round(Number(form.score) || 0))),
      createdAt: new Date(),
    };
    try {
      await createLead(lead);
      await onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create lead:', err);
      setError('Could not save this lead. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Add a lead
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Capture a new opportunity for your pipeline.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Cooper"
              className={`${fieldBase} w-full px-3.5 py-2.5`}
            />
          </Field>
          <Field label="Company">
            <input
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder="Acme Inc."
              className={`${fieldBase} w-full px-3.5 py-2.5`}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@acme.com"
              className={`${fieldBase} w-full px-3.5 py-2.5`}
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className={`${fieldBase} w-full px-3.5 py-2.5`}
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={form.status}
              onChange={(v) => set('status', v)}
              options={LEAD_STATUSES}
            />
          </Field>
          <Field label="Source">
            <SelectInput
              value={form.source}
              onChange={(v) => set('source', v)}
              options={LEAD_SOURCES}
            />
          </Field>
          <Field label="Industry">
            <SelectInput
              value={form.industry}
              onChange={(v) => set('industry', v)}
              options={LEAD_INDUSTRIES}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Value ($)">
              <input
                type="number"
                min={0}
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                className={`${fieldBase} w-full px-3.5 py-2.5`}
              />
            </Field>
            <Field label="Score">
              <input
                type="number"
                min={0}
                max={100}
                value={form.score}
                onChange={(e) => set('score', e.target.value)}
                className={`${fieldBase} w-full px-3.5 py-2.5`}
              />
            </Field>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 disabled:opacity-70"
          >
            {busy ? 'Saving…' : 'Create lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} w-full cursor-pointer appearance-none px-3.5 py-2.5 pr-9`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function LeadsPage() {
  const { leads, loading, refresh, setLeads } = useLeads();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sourceFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q)
      );
    });
  }, [leads, query, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const changeStatus = async (lead: LeadItem, status: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status } : l))
    );
    try {
      await updateLead(lead.id, { status });
    } catch (err) {
      console.error('Failed to update status:', err);
      await refresh();
    }
  };

  const remove = async (lead: LeadItem) => {
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    try {
      await deleteLead(lead.id);
    } catch (err) {
      console.error('Failed to delete lead:', err);
      await refresh();
    }
  };

  const hasLeads = leads.length > 0;

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={
          hasLeads
            ? `${formatNumber(leads.length)} leads in your workspace`
            : 'Track and manage your sales opportunities'
        }
        actions={
          <>
            {hasLeads && <ClearLeadsButton />}
            <GenerateLeadsButton tone="soft" />
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add lead
            </button>
          </>
        }
      />

      {!hasLeads && !loading ? (
        <EmptyLeads onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, company or email…"
                className={`${fieldBase} w-full py-2.5 pl-10 pr-3.5`}
              />
            </div>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={LEAD_STATUSES}
              allLabel="All statuses"
            />
            <FilterSelect
              value={sourceFilter}
              onChange={setSourceFilter}
              options={LEAD_SOURCES}
              allLabel="All sources"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Lead</th>
                  <th className="hidden px-5 py-3 md:table-cell">Source</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Industry</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="hidden px-5 py-3 text-right sm:table-cell">Score</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Added</th>
                  <th className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500">
                        {lead.company}
                        {lead.email ? ` · ${lead.email}` : ''}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-slate-600 md:table-cell">
                      {lead.source}
                    </td>
                    <td className="hidden px-5 py-3 text-slate-600 lg:table-cell">
                      {lead.industry}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(lead.value)}
                    </td>
                    <td className="hidden px-5 py-3 text-right sm:table-cell">
                      <ScorePill score={lead.score} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusSelect
                        value={lead.status}
                        onChange={(status) => void changeStatus(lead, status)}
                      />
                    </td>
                    <td className="hidden px-5 py-3 text-xs text-slate-500 lg:table-cell">
                      {relativeTime(lead.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => void remove(lead)}
                        title="Delete lead"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-sm text-slate-500">
                      No leads match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              <span>
                Showing{' '}
                <span className="font-medium text-slate-700">
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)}
                </span>{' '}
                of {formatNumber(filtered.length)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddLeadModal onClose={() => setShowAdd(false)} onCreated={refresh} />
      )}
    </>
  );
}

function EmptyLeads({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <UsersIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
          No leads yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Add your first lead, or generate a thousand realistic samples to see
          the tracker in action.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <GenerateLeadsButton count={1000} />
          <button
            onClick={onAdd}
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-indigo-600 hover:underline"
          >
            Add a lead manually
          </button>
        </div>
      </div>
    </div>
  );
}
