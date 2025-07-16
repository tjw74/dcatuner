// Softmax model for Tuned DCA allocation
// Accepts an array of z-scores and returns allocation weights
// Temperature parameter controls sensitivity: higher = more uniform, lower = more extreme

export function softmax(zScores: number[], temperature: number = 1.0): number[] {
  if (!Array.isArray(zScores) || zScores.length === 0) return [];
  if (temperature <= 0) {
    throw new Error('Temperature must be positive');
  }
  
  // Softmax transformation with numerical stability and temperature scaling
  const validScores = zScores.map((z) => (isFinite(z) ? z / temperature : 0));
  const max = Math.max(...validScores);
  const expScores = validScores.map((z) => Math.exp(z - max));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  
  return expScores.map((e) => (sumExp === 0 ? 0 : e / sumExp));
} 