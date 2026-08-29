import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { loadWorkspace } from '@/services/crm';
import type {
  AccountItem,
  ActivityItem,
  ContactItem,
  DealItem,
  RepItem,
  TagItem,
  Workspace,
} from '@/services/crmTypes';

interface CrmContextValue {
  reps: RepItem[];
  tags: TagItem[];
  accounts: AccountItem[];
  contacts: ContactItem[];
  deals: DealItem[];
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  /**
   * Bumped after every successful load. Server-side aggregations key off this
   * so they re-run when the workspace changes without depending on the row
   * arrays they are meant to avoid touching.
   */
  version: number;
  /** Re-fetch the whole workspace from the backend. */
  refresh: () => Promise<void>;
  /** Local optimistic update of deals for snappy UI; pair with a refresh. */
  setDeals: Dispatch<SetStateAction<DealItem[]>>;
}

const EMPTY_WORKSPACE: Workspace = {
  reps: [],
  tags: [],
  accounts: [],
  contacts: [],
  deals: [],
  activities: [],
};

const CrmContext = createContext<CrmContextValue | undefined>(undefined);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      if (!loadedOnce.current) setLoading(true);
      const data = await loadWorkspace();
      setWorkspace(data);
      setError(null);
      setVersion((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your workspace.');
    } finally {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDeals = useCallback<Dispatch<SetStateAction<DealItem[]>>>((update) => {
    setWorkspace((prev) => ({
      ...prev,
      deals: typeof update === 'function' ? update(prev.deals) : update,
    }));
  }, []);

  const value = useMemo<CrmContextValue>(
    () => ({
      reps: workspace.reps,
      tags: workspace.tags,
      accounts: workspace.accounts,
      contacts: workspace.contacts,
      deals: workspace.deals,
      activities: workspace.activities,
      loading,
      error,
      version,
      refresh,
      setDeals,
    }),
    [workspace, loading, error, version, refresh, setDeals]
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const context = useContext(CrmContext);
  if (context === undefined) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
}
