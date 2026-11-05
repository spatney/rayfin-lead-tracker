import { TrashIcon } from '@/components/icons';
import { useResetWorkspace } from '@/hooks/useResetWorkspace';

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function ResetDataButton() {
  const { run, busy, progress } = useResetWorkspace();

  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-rose-600 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-rose-400"
    >
      {busy ? <Spinner /> : <TrashIcon className="h-4 w-4" />}
      {busy ? `Resetting… ${progress.percent}%` : 'Reset app'}
    </button>
  );
}
