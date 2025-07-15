import { NextResponse } from 'next/server';
import { fetchAllMetrics } from '@/datamanager/fetchMetrics';
import { calculateDerivedMetrics } from '@/datamanager/derivedMetrics';

const DEFAULT_API_BASE = 'https://bitcoinresearchkit.org';

export async function GET() {
  try {
    const rawMetrics = await fetchAllMetrics(DEFAULT_API_BASE);
    const derivedMetrics = calculateDerivedMetrics(rawMetrics);
    // Return a sample (first 5 values) for each metric
    const sample = (obj: Record<string, number[]>) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, v.slice(0, 5)])
      );
    return NextResponse.json({
      raw: sample(rawMetrics),
      derived: sample(derivedMetrics),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 