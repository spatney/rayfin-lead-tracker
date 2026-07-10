import { useMemo } from 'react';
import { Chart, type ChartProps } from '@graphein/react';

import { useTheme } from '@/hooks/ThemeContext';
import { applyChartMode } from '@/services/chartSpecs';

/**
 * Drop-in replacement for graphein's `<Chart>` that re-themes the spec to match
 * the active light/dark theme. Any custom palette on the spec is preserved.
 */
export function ThemedChart({ spec, ...rest }: ChartProps) {
  const { isDark } = useTheme();
  const themedSpec = useMemo(() => applyChartMode(spec, isDark), [spec, isDark]);
  return <Chart spec={themedSpec} {...rest} />;
}
