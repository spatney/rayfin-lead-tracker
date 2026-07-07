import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useCrm } from '@/hooks/CrmContext';
import { resetWorkspace } from '@/services/crm';

type ResetProgress = {
  done: number;
  total: number;
  percent: number;
};

type ResetWorkspaceContextValue = {
  run: () => Promise<void>;
  busy: boolean;
  progress: ResetProgress;
};

const ResetWorkspaceContext = createContext<ResetWorkspaceContextValue | undefined>(
  undefined
);

function formatCount(value: number): string {
  return value.toLocaleString();
}

export function ResetWorkspaceProvider({ children }: { children: ReactNode }) {
  const { refresh } = useCrm();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ResetProgress>({
    done: 0,
    total: 0,
    percent: 0,
  });

  const run = useCallback(async () => {
    if (busy) return;
    if (
      !window.confirm(
        'Reset the workspace? This permanently removes every account, contact, deal, activity and rep.'
      )
    ) {
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: 0, percent: 0 });

    try {
      await resetWorkspace((done, total) => {
        setProgress({
          done,
          total,
          percent: total > 0 ? Math.round((done / total) * 100) : 0,
        });
      });
      await refresh();
    } catch (err) {
      console.error('Failed to reset workspace:', err);
      window.alert('Sorry — resetting the workspace failed. Please try again.');
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, percent: 0 });
    }
  }, [busy, refresh]);

  const value = useMemo(
    () => ({ run, busy, progress }),
    [run, busy, progress]
  );

  return (
    <ResetWorkspaceContext.Provider value={value}>
      {children}
    </ResetWorkspaceContext.Provider>
  );
}

/** Reset-workspace action with a confirm prompt and busy state. */
export function useResetWorkspace() {
  const context = useContext(ResetWorkspaceContext);
  if (context === undefined) {
    throw new Error('useResetWorkspace must be used within a ResetWorkspaceProvider');
  }
  return context;
}

export function ResetWorkspaceOverlay() {
  const { busy, progress } = useResetWorkspace();

  if (!busy) return null;

  const progressLabel =
    progress.total > 0
      ? `${formatCount(progress.done)} of ${formatCount(progress.total)} records removed`
      : 'Preparing reset…';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl shadow-slate-950/40 ring-1 ring-white/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="flex items-start gap-4">
          <div className="relative mt-1">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Resetting workspace
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Cleaning up your workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This can take a few moments on larger datasets. Keep this tab open while
              the workspace is cleared.
            </p>

            <div className="mt-5 space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.max(progress.percent, 6)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{progressLabel}</span>
                <span className="font-semibold tabular-nums text-white">
                  {progress.percent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
