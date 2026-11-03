import { useEffect, useId, useRef, useState } from 'react';

import { CheckIcon, PaletteIcon } from '@/components/icons';
import { useTheme } from '@/hooks/ThemeContext';
import { COLOR_PALETTES, type ColorPalette } from '@/services/colorPalettes';

export function PaletteSelect({
  variant = 'surface',
  placement,
}: {
  variant?: 'sidebar' | 'surface';
  placement?: 'top' | 'bottom' | 'right';
}) {
  const { palette, setPalette } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const menuPlacement = placement ?? (variant === 'sidebar' ? 'top' : 'bottom');

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const buttonStyles =
    variant === 'sidebar'
      ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
      : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';
  const menuStyles =
    variant === 'sidebar'
      ? 'border-slate-700 bg-slate-900'
      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
  const optionStyles =
    variant === 'sidebar'
      ? 'text-slate-300 hover:bg-slate-800'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        title={`Color palette: ${COLOR_PALETTES[palette].label}`}
        aria-label={`Color palette: ${COLOR_PALETTES[palette].label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${buttonStyles}`}
      >
        <PaletteIcon className="h-5 w-5" />
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-1 ring-white/80"
          style={{ backgroundColor: COLOR_PALETTES[palette].colors[0] }}
        />
      </button>
      {open && (
        <div
          id={menuId}
          className={`absolute z-50 w-36 rounded-xl border p-1.5 shadow-lg ${menuPlacement === 'top' ? 'right-0 bottom-full mb-2' : menuPlacement === 'right' ? 'left-full bottom-0 ml-2' : 'right-0 top-full mt-2'} ${menuStyles}`}
        >
          {Object.entries(COLOR_PALETTES).map(([value, option]) => (
            <button
              key={value}
              type="button"
              aria-pressed={palette === value}
              onClick={() => {
                setPalette(value as ColorPalette);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${optionStyles} ${palette === value ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : ''}`}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: option.colors[0] }}
              />
              <span className="flex-1">{option.label}</span>
              {palette === value && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
