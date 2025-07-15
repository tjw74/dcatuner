import { METRICS_LIST } from './metricsConfig';

const DEFAULT_API_BASE = "https://bitcoinresearchkit.org";

// Handles fetching all metrics from the selected API data source
// Extensible for new metrics as they are added

export async function fetchAllMetrics(apiBaseUrl: string = DEFAULT_API_BASE): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};

  await Promise.all(
    METRICS_LIST.map(async (metric) => {
      try {
        const url = `${apiBaseUrl}/api/vecs/dateindex-to-${metric}?from=-10000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${metric}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          console.error(`Metric '${metric}' returned empty or invalid data from:`, url);
        }
        results[metric] = Array.isArray(data)
          ? data.map((v) =>
              typeof v === 'number'
                ? v
                : v && typeof v === 'object' && 'value' in v
                ? v.value
                : null
            )
          : [];
      } catch (e) {
        console.error(`Error fetching metric '${metric}':`, e);
        results[metric] = [];
      }
    })
  );

  return results;
} 