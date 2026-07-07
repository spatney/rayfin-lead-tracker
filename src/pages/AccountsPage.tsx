import { useEffect, useMemo, useState } from 'react';
import { Chart } from '@graphein/react';

import { GenerateDataButton, ResetDataButton } from '@/components/dataActions';
import {
  BuildingIcon,
  ChevronDownIcon,
  DollarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/icons';
import {
  ChartCard,
  KpiCard,
  PageHeader,
  StageBadge,
  TierBadge,
  type Accent,
} from '@/components/ui';
import { useCrm } from '@/hooks/CrmContext';
import { topAccounts, type AccountValue } from '@/services/analytics';
import { buildTopAccountsTableSpec } from '@/services/chartSpecs';
import {
  ACCOUNT_TIERS,
  contactName,
  type AccountItem,
} from '@/services/crmTypes';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from '@/services/format';

const fieldBase =
  'rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const ACCENTS: Record<string, Accent> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
};

export function AccountsPage() {
  const { accounts, contacts, deals, loading } = useCrm();
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const valueByAccount = useMemo(() => {
    const map = new Map<string, AccountValue>();
    for (const av of topAccounts(deals, accounts, accounts.length)) {
      map.set(av.accountId, av);
    }
    return map;
  }, [deals, accounts]);

  const dealsByAccount = useMemo(() => {
    const map = new Map<string, typeof deals>();
    for (const deal of deals) {
      const list = map.get(deal.accountId) ?? [];
      list.push(deal);
      map.set(deal.accountId, list);
    }
    return map;
  }, [deals]);

  const contactsByAccount = useMemo(() => {
    const map = new Map<string, typeof contacts>();
    for (const contact of contacts) {
      const list = map.get(contact.accountId) ?? [];
      list.push(contact);
      map.set(contact.accountId, list);
    }
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts
      .filter((account) => {
        if (tierFilter !== 'all' && account.tier !== tierFilter) return false;
        if (!q) return true;
        return (
          account.name.toLowerCase().includes(q) ||
          account.industry.toLowerCase().includes(q) ||
          account.city.toLowerCase().includes(q) ||
          account.ownerName.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          (valueByAccount.get(b.id)?.totalValue ?? 0) -
          (valueByAccount.get(a.id)?.totalValue ?? 0)
      );
  }, [accounts, query, tierFilter, valueByAccount]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((a) => a.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  const totals = useMemo(() => {
    let openValue = 0;
    let wonValue = 0;
    for (const av of valueByAccount.values()) {
      openValue += av.openValue;
      wonValue += av.wonValue;
    }
    return { openValue, wonValue };
  }, [valueByAccount]);

  const topSpec = useMemo(
    () => buildTopAccountsTableSpec(topAccounts(deals, accounts, 8)),
    [deals, accounts]
  );

  const hasAccounts = accounts.length > 0;

  if (loading && accounts.length === 0) {
    return (
      <>
        <PageHeader title="Accounts" subtitle="Your customers and prospects" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </>
    );
  }

  if (!hasAccounts) {
    return (
      <>
        <PageHeader title="Accounts" subtitle="Your customers and prospects" />
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm shadow-slate-200/40">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BuildingIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
              No accounts yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Generate a sample workspace to populate accounts, their contacts
              and every deal in play.
            </p>
            <div className="mt-6 flex justify-center">
              <GenerateDataButton />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle={`${formatNumber(accounts.length)} companies · ${formatNumber(contacts.length)} contacts`}
        actions={<ResetDataButton />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Accounts"
          value={formatNumber(accounts.length)}
          icon={BuildingIcon}
          accent={ACCENTS.indigo}
        />
        <KpiCard
          label="Contacts"
          value={formatNumber(contacts.length)}
          icon={UsersIcon}
          accent={ACCENTS.sky}
        />
        <KpiCard
          label="Open pipeline"
          value={formatCompactCurrency(totals.openValue)}
          icon={DollarIcon}
          accent={ACCENTS.amber}
        />
        <KpiCard
          label="Won value"
          value={formatCompactCurrency(totals.wonValue)}
          icon={TrendingUpIcon}
          accent={ACCENTS.green}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 lg:col-span-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts…"
                className={`${fieldBase} w-full py-2.5 pl-10 pr-3.5`}
              />
            </div>
            <div className="relative">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className={`${fieldBase} w-full cursor-pointer appearance-none py-2.5 pl-3.5 pr-9`}
              >
                <option value="all">All tiers</option>
                {ACCOUNT_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="max-h-[32rem] overflow-y-auto p-2">
            {filtered.map((account) => {
              const av = valueByAccount.get(account.id);
              const active = account.id === selectedId;
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedId(account.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <BuildingIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {account.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {account.industry}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-900">
                      {formatCompactCurrency(av?.totalValue ?? 0)}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {formatNumber(av?.dealCount ?? 0)} deals
                    </span>
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-slate-500">
                No accounts match your filters.
              </p>
            )}
          </div>
        </section>

        <div className="lg:col-span-7">
          {selected ? (
            <AccountDetail
              account={selected}
              value={valueByAccount.get(selected.id)}
              deals={dealsByAccount.get(selected.id) ?? []}
              contacts={contactsByAccount.get(selected.id) ?? []}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm text-slate-400 shadow-sm shadow-slate-200/40">
              Select an account to see its contacts and deals.
            </div>
          )}
        </div>

        <ChartCard
          title="Top accounts by value"
          subtitle="Ranked by total pipeline + won value"
          className="lg:col-span-12"
        >
          <div className="h-96">
            <Chart spec={topSpec} />
          </div>
        </ChartCard>
      </div>
    </>
  );
}

function AccountDetail({
  account,
  value,
  deals,
  contacts,
}: {
  account: AccountItem;
  value?: AccountValue;
  deals: { id: string; name: string; stage: string; value: number }[];
  contacts: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
  }[];
}) {
  const sortedDeals = [...deals].sort((a, b) => b.value - a.value);
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
              {account.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{account.industry}</p>
          </div>
          <TierBadge tier={account.tier} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
          <span className="inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-slate-400" />
            {account.city}, {account.country}
          </span>
          <span className="inline-flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-slate-400" />
            <span className="truncate">{account.website}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-slate-400" />
            {formatNumber(account.employeeCount)} employees
          </span>
          <span className="inline-flex items-center gap-2">
            <DollarIcon className="h-4 w-4 text-slate-400" />
            {formatCompactCurrency(account.annualRevenue)} revenue
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Owned by <span className="font-medium text-slate-600">{account.ownerName}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Deals" value={formatNumber(value?.dealCount ?? deals.length)} />
        <MiniStat label="Open" value={formatCompactCurrency(value?.openValue ?? 0)} />
        <MiniStat label="Won" value={formatCompactCurrency(value?.wonValue ?? 0)} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Deals ({deals.length})
        </h3>
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {sortedDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {deal.name}
              </span>
              <StageBadge stage={deal.stage} />
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                {formatCurrency(deal.value)}
              </span>
            </div>
          ))}
          {deals.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No deals yet.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contacts ({contacts.length})
        </h3>
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-lg border border-slate-100 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {contactName(contact)}
                </span>
                <span className="text-xs text-slate-400">{contact.title}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon className="h-3.5 w-3.5 text-slate-400" />
                  {contact.email}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                  {contact.phone}
                </span>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">
              No contacts yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <p className="text-sm font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
