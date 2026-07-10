import { MoonIcon, SunIcon } from '@/components/icons';
import { useTheme } from '@/hooks/ThemeContext';

/**
 * Light/dark theme switch. Two visual flavours:
 * - `sidebar` sits on the dark navigation rail (light-on-dark).
 * - `surface` sits on a light/dark card and adapts with `dark:` variants.
 */
export function ThemeToggle({
  variant = 'surface',
  className = '',
}: {
  variant?: 'sidebar' | 'surface';
  className?: string;
}) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  const styles =
    variant === 'sidebar'
      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
      : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${styles} ${className}`}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
