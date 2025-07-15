// DCA module: regular DCA, tuned DCA, and models

// Regular DCA calculation
export function calculateRegularDCA(
  priceData: number[],
  budgetPerDay: number,
  windowSize: number
): number[] {
  // Only consider the last windowSize days
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  const dailyBuy = budgetPerDay;
  const btcBought = data.map((price) => (price > 0 ? dailyBuy / price : 0));
  return btcBought;
}

// Softmax model for allocation weights
export function softmaxModel(zScores: number[]): number[] {
  // Softmax transformation (numerical stability)
  const max = Math.max(...zScores.map((z) => (isFinite(z) ? z : 0)));
  const expScores = zScores.map((z) => Math.exp((isFinite(z) ? z : 0) - max));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map((e) => (sumExp === 0 ? 0 : e / sumExp));
}

// Tuned DCA calculation using a model (e.g., softmax)
export function calculateTunedDCA(
  priceData: number[],
  zScores: number[],
  budgetPerDay: number,
  windowSize: number,
  model: (zScores: number[]) => number[]
): number[] {
  // Only consider the last windowSize days
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  const z = windowSize === Infinity ? zScores : zScores.slice(-windowSize);
  // Get allocation weights from model
  const weights = model(z);
  // Total budget for the window
  const totalBudget = budgetPerDay * (windowSize === Infinity ? priceData.length : windowSize);
  // Allocate budget proportionally to weights
  const allocatedBudget = weights.map((w) => w * totalBudget);
  // Calculate BTC bought each day
  const btcBought = data.map((price, i) => (price > 0 ? allocatedBudget[i] / price : 0));
  return btcBought;
}

// Add more models here as needed
export const dcaModels = {
  softmax: softmaxModel,
  // futureModel: (zScores: number[]) => { ... },
};

// Run all models and return their results for leaderboard
export function getAllTunedDCAResults(
  priceData: number[],
  zScores: number[],
  budgetPerDay: number,
  windowSize: number
): Record<string, number[]> {
  const results: Record<string, number[]> = {};
  for (const [name, model] of Object.entries(dcaModels)) {
    results[name] = calculateTunedDCA(priceData, zScores, budgetPerDay, windowSize, model);
  }
  return results;
} 