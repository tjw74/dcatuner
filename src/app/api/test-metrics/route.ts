import { NextResponse } from 'next/server';
import { fetchAllMetrics } from '@/datamanager/fetchMetrics';
import { calculateDerivedMetrics } from '@/datamanager/derivedMetrics';

const DEFAULT_API_BASE = 'https://bitcoinresearchkit.org';

export async function GET() {
  try {
    const rawMetrics = await fetchAllMetrics(DEFAULT_API_BASE);
    const derivedMetrics = calculateDerivedMetrics(rawMetrics.metrics);
    // Return a sample (last 5 values) for each metric
    const sample = (obj: Record<string, number[]>) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, v.slice(-5)])
      );
    return NextResponse.json({
      raw: sample(rawMetrics.metrics),
      derived: sample(derivedMetrics),
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 