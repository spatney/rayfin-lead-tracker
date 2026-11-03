export const COLOR_PALETTES = {
  indigo: {
    label: 'Indigo',
    colors: [
      '#6366f1',
      '#0ea5e9',
      '#14b8a6',
      '#f59e0b',
      '#a855f7',
      '#22c55e',
      '#fb7185',
      '#f97316',
      '#3b82f6',
      '#84cc16',
    ],
  },
  blue: {
    label: 'Ocean',
    colors: [
      '#2563eb',
      '#0891b2',
      '#0d9488',
      '#ea580c',
      '#7c3aed',
      '#16a34a',
      '#db2777',
      '#c2410c',
      '#0284c7',
      '#65a30d',
    ],
  },
  emerald: {
    label: 'Emerald',
    colors: [
      '#059669',
      '#0d9488',
      '#2563eb',
      '#d97706',
      '#7c3aed',
      '#65a30d',
      '#e11d48',
      '#ea580c',
      '#0891b2',
      '#4f46e5',
    ],
  },
  rose: {
    label: 'Rose',
    colors: [
      '#e11d48',
      '#db2777',
      '#7c3aed',
      '#d97706',
      '#0891b2',
      '#16a34a',
      '#f97316',
      '#be123c',
      '#2563eb',
      '#65a30d',
    ],
  },
} as const;

export type ColorPalette = keyof typeof COLOR_PALETTES;
