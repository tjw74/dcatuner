// Softmax model for Tuned DCA allocation
// Accepts an array of z-scores and returns allocation weights

export function softmax(zScores: number[]): number[] {
  if (!Array.isArray(zScores) || zScores.length === 0) return [];
  
  // Softmax transformation with numerical stability
  const validScores = zScores.map((z) => (isFinite(z) ? z : 0));
  const max = Math.max(...validScores);
  const expScores = validScores.map((z) => Math.exp(z - max));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  
  return expScores.map((e) => (sumExp === 0 ? 0 : e / sumExp));
} 