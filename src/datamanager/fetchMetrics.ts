import { METRICS_LIST } from './metricsConfig';

const DEFAULT_API_BASE = "https://bitcoinresearchkit.org";

// Fetch the latest date to ensure all metrics are aligned to the same end date
export async function fetchLatestDate(apiBaseUrl: string = DEFAULT_API_BASE): Promise<string> {
  try {
    const url = `${apiBaseUrl}/api/vecs/dateindex-to-date?from=-1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch latest date');
    const data = await res.json();
    if (typeof data === 'string') {
      return data;
    }
    throw new Error('Invalid date format received');
  } catch (e) {
    throw new Error(`Failed to fetch latest date: ${e}`);
  }
}

// Handles fetching all metrics from the selected API data source
// All metrics are fetched with the same 'from' parameter to ensure perfect alignment
export async function fetchAllMetrics(apiBaseUrl: string = DEFAULT_API_BASE): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};
  
  // Fetch all metrics in parallel with the same 'from' parameter for guaranteed alignment
  const fetchPromises = METRICS_LIST.map(async (metric): Promise<[string, number[]]> => {
    try {
      const url = `${apiBaseUrl}/api/vecs/dateindex-to-${metric}?from=-10000`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${metric}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        // Return empty array for missing metrics
        return [metric, []];
      }
      const processedData = data.map((v) =>
        typeof v === 'number'
          ? v
          : v && typeof v === 'object' && 'value' in v
          ? v.value
          : null
      );
      return [metric, processedData];
    } catch (e) {
      // Return empty array for failed fetches
      return [metric, []];
    }
  });

  const fetchResults = await Promise.all(fetchPromises);
  
  // Convert results to object
  for (const [metric, data] of fetchResults) {
    results[metric] = data;
  }

  // Verify alignment: all non-empty metrics should have the same length
  const nonEmptyMetrics = Object.entries(results).filter(([, data]) => data.length > 0);
  if (nonEmptyMetrics.length > 1) {
    const lengths = nonEmptyMetrics.map(([metric, data]) => ({ metric, length: data.length }));
    const firstLength = lengths[0].length;
    const misaligned = lengths.filter(({ length }) => length !== firstLength);
    
    if (misaligned.length > 0) {
      throw new Error(`Metric alignment error: Expected all metrics to have length ${firstLength}, but found misaligned metrics: ${misaligned.map(({ metric, length }) => `${metric}(${length})`).join(', ')}`);
    }
  }

  return results;
} 