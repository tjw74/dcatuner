import { METRICS_LIST } from './metricsConfig';

// Handles fetching all metrics from the selected API data source
// Extensible for new metrics as they are added

export async function fetchAllMetrics(apiBaseUrl: string): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};

  await Promise.all(
    METRICS_LIST.map(async (metric) => {
      try {
        const url = `${apiBaseUrl}/api/vecs/dateindex-to-${metric}?from=-10000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${metric}`);
        const data = await res.json();
        // Assume data is an array of numbers (or objects with value)
        // If API returns objects, adjust parsing here
        results[metric] = Array.isArray(data)
          ? data.map((v) => (typeof v === 'number' ? v : v.value ?? null))
          : [];
      } catch (e) {
        results[metric] = [];
      }
    })
  );

  return results;
} 