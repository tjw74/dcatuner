// Handles rolling window z-score calculations for all metrics
// Default window: 4 years (1460 days); options: 2yr (730), 4yr (1460), 8yr (2920), all

export function calculateZScores(
  metricData: number[],
  windowSize: number
): number[] {
  if (!Array.isArray(metricData) || metricData.length === 0) return [];
  const zScores: number[] = [];
  for (let i = 0; i < metricData.length; i++) {
    // Determine window start and end
    const start = Math.max(0, i - windowSize + 1);
    const window = metricData.slice(start, i + 1).filter((v) => typeof v === 'number' && !isNaN(v));
    if (window.length < 2) {
      zScores.push(NaN);
      continue;
    }
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const std = Math.sqrt(window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length);
    zScores.push(std === 0 ? 0 : (metricData[i] - mean) / std);
  }
  return zScores;
}

// Helper for window size options (in days)
export const Z_SCORE_WINDOWS = {
  '2yr': 730,
  '4yr': 1460,
  '8yr': 2920,
  'all': Infinity,
}; 