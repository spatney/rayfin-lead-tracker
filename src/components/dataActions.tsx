import { useState } from 'react';

import { SparklesIcon, TrashIcon } from '@/components/icons';
import { useCrm } from '@/hooks/CrmContext';
import { useResetWorkspace } from '@/hooks/useResetWorkspace';
import { generateSampleData } from '@/services/crm';

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function GenerateDataButton({
  tone = 'primary',
  label = 'Generate sample data',
}: {
  tone?: 'primary' | 'soft';
  label?: string;
}) {
  const { refresh } = useCrm();
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setPercent(0);
    try {
      await generateSampleData(undefined, (done, total) =>
        setPercent(total ? Math.round((done / total) * 100) : 0)
      );
      await refresh();
    } catch (err) {
      console.error('Failed to generate sample data:', err);
      window.alert('Sorry — generating sample data failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70';
  const styles =
    tone === 'primary'
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700'
      : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50';

  return (
    <button onClick={() => void run()} disabled={busy} className={`${base} ${styles}`}>
      {busy ? <Spinner /> : <SparklesIcon className="h-4 w-4" />}
      {busy ? `Generating… ${percent}%` : label}
    </button>
  );
}

export function ResetDataButton() {
  const { run, busy, progress } = useResetWorkspace();

  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-rose-600 disabled:opacity-70"
    >
      {busy ? <Spinner /> : <TrashIcon className="h-4 w-4" />}
      {busy ? `Resetting… ${progress.percent}%` : 'Reset data'}
    </button>
  );
}
