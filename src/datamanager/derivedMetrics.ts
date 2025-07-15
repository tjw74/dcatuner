import { DERIVED_METRICS } from './metricsConfig';

// Handles calculation of derived metrics (e.g., MVRV Ratio)
// Extensible for new derived metrics as they are added

export function calculateDerivedMetrics(metrics: Record<string, number[]>): Record<string, number[]> {
  const derived: Record<string, number[]> = {};
  for (const { name, formula } of DERIVED_METRICS) {
    derived[name] = formula(metrics);
  }
  return derived;
} 