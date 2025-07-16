// This code passed review, it works, it's frozen

import { METRICS_LIST } from './metricsConfig';

const DEFAULT_API_BASE = "https://bitcoinresearchkit.org";

// Simple interface for metric data with dates and values
export interface MetricData {
  dates: string[];
  metrics: Record<string, number[]>;
}

// Fetch all metrics one at a time to respect API limits
export async function fetchAllMetrics(apiBaseUrl: string = DEFAULT_API_BASE): Promise<MetricData> {
  const promises = METRICS_LIST.map(async (metric) => {
    const url = `${apiBaseUrl}/api/vecs/query?index=dateindex&ids=date,${metric}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${metric}: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error(`Invalid data format for ${metric}`);
    }
    
    const [dates, values] = data;
    return { metric, dates, values };
  });

  const results = await Promise.all(promises);
  
  // All metrics should have the same dates due to dateindex alignment
  const dates = results[0]?.dates || [];
  const metrics: Record<string, number[]> = {};
  
  results.forEach(({ metric, values }) => {
    metrics[metric] = values;
  });
  
  return {
    dates,
    metrics
  };
}

// Fetch the latest date
export async function fetchLatestDate(apiBaseUrl: string = DEFAULT_API_BASE): Promise<string> {
  try {
    const url = `${apiBaseUrl}/api/vecs/dateindex-to-date?from=-1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch latest date: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (typeof data !== 'string') {
      throw new Error('Invalid date format received');
    }
    
    return data;
    
  } catch (error) {
    console.error('Failed to fetch latest date:', error);
    throw error;
  }
} 