/**
 * Dashboard data sourced from server-side aggregation.
 *
 * `groupBy` aggregation is new in the Rayfin SDK and depends on the deployed
 * Data API Builder accepting it, so this hook degrades gracefully: if an
 * aggregation query fails, it falls back to folding the already-loaded deal
 * rows with `analytics.ts`. The fallback maths is only ever run when it is
 * actually needed — the whole point of the aggregate path is to not do it.
 */

import { useEffect, useMemo, useState } from 'react';

import { useCrm } from './CrmContext';
import {
  EMPTY_AGGREGATES,
  fetchDashboardAggregates,
  type DashboardAggregates,
} from '@/services/aggregates';
import {
  computeKpis,
  cumulativeFunnel,
  dealsByOwner,
  dealsBySource,
  dealsByStage,
  dealsOverTime,
} from '@/services/analytics';
import type { DealItem } from '@/services/crmTypes';

export interface DealAggregatesState {
  data: DashboardAggregates;
  /** True while the first aggregation for the current scope is still in flight. */
  loading: boolean;
  /** False once we have had to fall back to client-side maths. */
  serverSide: boolean;
}

function computeLocally(deals: DealItem[], sources: string[]): DashboardAggregates {
  const scoped =
    sources.length > 0 ? deals.filter((deal) => sources.includes(deal.source)) : deals;
  const stageCounts = dealsByStage(scoped);

  return {
    kpis: computeKpis(scoped),
    stageCounts,
    funnel: cumulativeFunnel(stageCounts),
    // Unscoped, matching the aggregate path: every bar stays clickable.
    sourceCounts: dealsBySource(deals),
    owners: dealsByOwner(scoped),
    overTime: dealsOverTime(scoped),
    wonCount: stageCounts.find((entry) => entry.stage === 'Won')?.count ?? 0,
    lostCount: stageCounts.find((entry) => entry.stage === 'Lost')?.count ?? 0,
  };
}

/**
 * @param sources - Deal sources to scope the dashboard to; empty means all.
 */
export function useDealAggregates(sources: string[]): DealAggregatesState {
  const { deals, loading: workspaceLoading, version } = useCrm();
  // Key on the contents rather than the array identity so a re-render with an
  // equivalent filter does not re-issue the queries.
  const scopeKey = sources.join('\u0000');

  const [remote, setRemote] = useState<DashboardAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchDashboardAggregates({ sources: scopeKey ? scopeKey.split('\u0000') : [] })
      .then((data) => {
        if (cancelled) return;
        setRemote(data);
        setFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Falling back to client-side analytics:', err);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scopeKey, version]);

  const local = useMemo(
    () => (failed ? computeLocally(deals, scopeKey ? scopeKey.split('\u0000') : []) : null),
    [failed, deals, scopeKey]
  );

  return {
    data: local ?? remote ?? EMPTY_AGGREGATES,
    // Only ever show a skeleton when there is nothing to draw yet: a scope
    // change keeps the previous numbers on screen while the new ones load.
    loading: failed ? workspaceLoading && deals.length === 0 : loading && remote === null,
    serverSide: !failed,
  };
}
