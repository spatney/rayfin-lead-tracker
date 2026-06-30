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

import { getLeads } from '@/services/leads';
import type { LeadItem } from '@/services/leadTypes';

interface LeadsContextValue {
  leads: LeadItem[];
  loading: boolean;
  error: string | null;
  /** Re-fetch all leads from the backend. */
  refresh: () => Promise<void>;
  /** Local optimistic update for snappy UI; pair with a background refresh. */
  setLeads: Dispatch<SetStateAction<LeadItem[]>>;
}

const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      if (!loadedOnce.current) setLoading(true);
      const data = await getLeads();
      setLeads(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads.');
    } finally {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<LeadsContextValue>(
    () => ({ leads, loading, error, refresh, setLeads }),
    [leads, loading, error, refresh]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const context = useContext(LeadsContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}
