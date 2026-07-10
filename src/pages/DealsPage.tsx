import { useEffect, useMemo, useState } from 'react';

import { GenerateDataButton, ResetDataButton } from '@/components/dataActions';
import {
  BriefcaseIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from '@/components/icons';
import { PageHeader, ScorePill, TagChip } from '@/components/ui';
import { useCrm } from '@/hooks/CrmContext';
import { createDeal, deleteDeal, updateDealStage } from '@/services/crm';
import {
  DEAL_SOURCES,
  DEAL_STAGES,
  defaultProbability,
  stageMeta,
  type DealItem,
  type DealStage,
  type NewDeal,
} from '@/services/crmTypes';
import { buildSampleDealScalars } from '@/services/sampleData';
import { formatCurrency, formatNumber, relativeTime } from '@/services/format';

const PAGE_SIZE = 12;

const fieldBase =
  'rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/30';

function StageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (stage: string) => void;
}) {
  const meta = stageMeta(value);
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 ${meta.bg} ${meta.text}`}
      >
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s} className="bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200">
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
        className={`${fieldBase} w-full cursor-pointer appearance-none py-2.5 pl-3.5 pr-9 sm:w-40`}
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

function OwnerFilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} w-full cursor-pointer appearance-none py-2.5 pl-3.5 pr-9 sm:w-40`}
      >
        <option value="all">All owners</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

interface AddDealModalProps {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

function AddDealModal({ onClose, onCreated }: AddDealModalProps) {
  const { accounts, contacts, reps, tags } = useCrm();
  const [form, setForm] = useState({
    name: '',
    accountId: accounts[0]?.id ?? '',
    contactId: '',
    ownerId: reps[0]?.id ?? '',
    stage: 'New',
    source: 'Website',
    value: '25000',
    score: '55',
  });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = accounts.length > 0 && reps.length > 0;

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setAccount = (id: string) =>
    setForm((prev) => ({ ...prev, accountId: id, contactId: '' }));

  const contactsForAccount = useMemo(
    () => contacts.filter((c) => c.accountId === form.accountId),
    [contacts, form.accountId]
  );

  const toggleTag = (id: string) =>
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const autoFill = () => {
    const sample = buildSampleDealScalars();
    const account =
      accounts[Math.floor(Math.random() * accounts.length)] ?? accounts[0];
    const owner = reps[Math.floor(Math.random() * reps.length)] ?? reps[0];
    setForm({
      name: sample.name,
      accountId: account?.id ?? '',
      contactId: '',
      ownerId: owner?.id ?? '',
      stage: sample.stage,
      source: sample.source,
      value: String(sample.value),
      score: String(sample.score),
    });
    const shuffled = [...tags].sort(() => Math.random() - 0.5);
    setTagIds(shuffled.slice(0, Math.min(2, shuffled.length)).map((t) => t.id));
    setError(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError('A deal name is required.');
      return;
    }
    if (!form.accountId || !form.ownerId) {
      setError('Pick an account and an owner for this deal.');
      return;
    }
    setBusy(true);
    setError(null);
    const stage = form.stage as DealStage;
    const deal: NewDeal = {
      name: form.name.trim(),
      stage,
      source: form.source,
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      score: Math.min(100, Math.max(0, Math.round(Number(form.score) || 0))),
      probability: defaultProbability(stage),
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      closedAt: stage === 'Won' || stage === 'Lost' ? new Date() : null,
      accountId: form.accountId,
      contactId: form.contactId || null,
      ownerId: form.ownerId,
      tagIds,
    };
    try {
      await createDeal(deal);
      await onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create deal:', err);
      setError('Could not save this deal. Please try again.');
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
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Add a deal
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Open a new opportunity in your pipeline.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {!canCreate ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Deals need an account and an owner. Generate sample data first, then
            add deals of your own.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Deal name">
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Acme — Platform expansion"
                  className={`${fieldBase} w-full px-3.5 py-2.5`}
                />
              </Field>
            </div>
            <Field label="Account">
              <IdSelect
                value={form.accountId}
                onChange={setAccount}
                options={accounts.map((a) => ({ id: a.id, label: a.name }))}
              />
            </Field>
            <Field label="Contact">
              <IdSelect
                value={form.contactId}
                onChange={(v) => set('contactId', v)}
                options={contactsForAccount.map((c) => ({
                  id: c.id,
                  label: `${c.firstName} ${c.lastName}`,
                }))}
                placeholder="— None —"
              />
            </Field>
            <Field label="Owner">
              <IdSelect
                value={form.ownerId}
                onChange={(v) => set('ownerId', v)}
                options={reps.map((r) => ({ id: r.id, label: r.name }))}
              />
            </Field>
            <Field label="Source">
              <SelectInput
                value={form.source}
                onChange={(v) => set('source', v)}
                options={DEAL_SOURCES}
              />
            </Field>
            <Field label="Stage">
              <SelectInput
                value={form.stage}
                onChange={(v) => set('stage', v)}
                options={DEAL_STAGES}
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
            {tags.length > 0 && (
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                          active
                            ? 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={autoFill}
            disabled={!canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
          >
            <SparklesIcon className="h-4 w-4" />
            Auto-fill sample
          </button>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={busy || !canCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 disabled:opacity-70"
            >
              {busy ? 'Saving…' : 'Create deal'}
            </button>
          </div>
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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

function IdSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} w-full cursor-pointer appearance-none px-3.5 py-2.5 pr-9`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

export function DealsPage() {
  const { deals, reps, tags, loading, refresh, setDeals } = useCrm();
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  useEffect(() => {
    setPage(1);
  }, [query, stageFilter, sourceFilter, ownerFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((deal) => {
      if (stageFilter !== 'all' && deal.stage !== stageFilter) return false;
      if (sourceFilter !== 'all' && deal.source !== sourceFilter) return false;
      if (ownerFilter !== 'all' && deal.ownerId !== ownerFilter) return false;
      if (!q) return true;
      return (
        deal.name.toLowerCase().includes(q) ||
        deal.accountName.toLowerCase().includes(q) ||
        (deal.contactName?.toLowerCase().includes(q) ?? false) ||
        deal.ownerName.toLowerCase().includes(q)
      );
    });
  }, [deals, query, stageFilter, sourceFilter, ownerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const changeStage = async (deal: DealItem, stage: string) => {
    const next = stage as DealStage;
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? { ...d, stage: next, probability: defaultProbability(next) }
          : d
      )
    );
    try {
      await updateDealStage(deal.id, next);
    } catch (err) {
      console.error('Failed to update stage:', err);
      await refresh();
    }
  };

  const remove = async (deal: DealItem) => {
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    try {
      await deleteDeal(deal.id);
    } catch (err) {
      console.error('Failed to delete deal:', err);
    } finally {
      await refresh();
    }
  };

  const hasDeals = deals.length > 0;

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={
          hasDeals
            ? `${formatNumber(deals.length)} deals in your pipeline`
            : 'Track and manage your sales opportunities'
        }
        actions={
          <>
            {hasDeals ? <ResetDataButton /> : <GenerateDataButton tone="soft" />}
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add deal
            </button>
          </>
        }
      />

      {!hasDeals && !loading ? (
        <EmptyDeals onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center dark:border-slate-800">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deal, account, contact or owner…"
                className={`${fieldBase} w-full py-2.5 pl-10 pr-3.5`}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FilterSelect
                value={stageFilter}
                onChange={setStageFilter}
                options={DEAL_STAGES}
                allLabel="All stages"
              />
              <FilterSelect
                value={sourceFilter}
                onChange={setSourceFilter}
                options={DEAL_SOURCES}
                allLabel="All sources"
              />
              <OwnerFilterSelect
                value={ownerFilter}
                onChange={setOwnerFilter}
                options={reps.map((r) => ({ id: r.id, label: r.name }))}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3">Deal</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Owner</th>
                  <th className="hidden px-5 py-3 md:table-cell">Source</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="hidden px-5 py-3 text-right sm:table-cell">Score</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="hidden px-5 py-3 xl:table-cell">Tags</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Added</th>
                  <th className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((deal) => {
                  const dealTags = deal.tagIds
                    .map((id) => tagById.get(id))
                    .filter((t): t is NonNullable<typeof t> => Boolean(t));
                  return (
                    <tr
                      key={deal.id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{deal.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {deal.accountName}
                          {deal.contactName ? ` · ${deal.contactName}` : ''}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-600 lg:table-cell dark:text-slate-300">
                        {deal.ownerName}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-600 md:table-cell dark:text-slate-300">
                        {deal.source}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(deal.value)}
                      </td>
                      <td className="hidden px-5 py-3 text-right sm:table-cell">
                        <ScorePill score={deal.score} />
                      </td>
                      <td className="px-5 py-3">
                        <StageSelect
                          value={deal.stage}
                          onChange={(stage) => void changeStage(deal, stage)}
                        />
                      </td>
                      <td className="hidden px-5 py-3 xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {dealTags.slice(0, 2).map((tag) => (
                            <TagChip key={tag.id} label={tag.label} color={tag.color} />
                          ))}
                          {dealTags.length > 2 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              +{dealTags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-xs text-slate-500 lg:table-cell dark:text-slate-400">
                        {relativeTime(deal.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => void remove(deal)}
                          title="Delete deal"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                      No deals match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)}
                </span>{' '}
                of {formatNumber(filtered.length)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <span className="px-2 tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddDealModal onClose={() => setShowAdd(false)} onCreated={refresh} />
      )}
    </>
  );
}

function EmptyDeals({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <BriefcaseIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          No deals yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Generate a full sample workspace — reps, accounts, contacts, deals and
          activities — to see the CRM come alive.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <GenerateDataButton />
          <button
            onClick={onAdd}
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-400"
          >
            Add a deal manually
          </button>
        </div>
      </div>
    </div>
  );
}
