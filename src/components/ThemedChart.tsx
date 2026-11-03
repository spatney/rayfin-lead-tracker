import { useMemo } from 'react';
import { Chart, type ChartProps } from '@graphein/react';

import { useTheme } from '@/hooks/ThemeContext';
import { COLOR_PALETTES } from '@/services/colorPalettes';
import { applyChartMode } from '@/services/chartSpecs';

/**
 * Drop-in replacement for graphein's `<Chart>` that re-themes the spec to match
 * the active light/dark theme and selected color palette.
 */
export function ThemedChart({ spec, ...rest }: ChartProps) {
  const { isDark, palette } = useTheme();
  const chartPalette = COLOR_PALETTES[palette].colors;
  const themedSpec = useMemo(
    () => applyChartMode(spec, isDark, chartPalette),
    [spec, isDark, chartPalette]
  );
  return <Chart spec={themedSpec} {...rest} />;
}
