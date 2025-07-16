// DCA module: regular DCA, tuned DCA, and models

import { softmax } from './models/softmax';

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
export function softmaxModel(zScores: number[], temperature: number = 1.0): number[] {
  return softmax(zScores, temperature);
}

// Tuned DCA calculation using a model (e.g., softmax)
export function calculateTunedDCA(
  priceData: number[],
  zScores: number[],
  budgetPerDay: number,
  windowSize: number,
  model: (zScores: number[], temperature?: number) => number[],
  temperature: number = 1.0
): number[] {
  // Only consider the last windowSize days
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  const z = windowSize === Infinity ? zScores : zScores.slice(-windowSize);
  // Get allocation weights from model
  const weights = model(z, temperature);
  // Total budget for the window
  const actualWindowSize = windowSize === Infinity ? data.length : windowSize;
  const totalBudget = budgetPerDay * actualWindowSize;
  // Ensure weights array matches data length
  if (weights.length !== data.length) {
    // Handle weight array length mismatch gracefully
    // Pad or truncate weights to match data length
    const adjustedWeights = Array(data.length).fill(0);
    for (let i = 0; i < Math.min(weights.length, data.length); i++) {
      adjustedWeights[i] = weights[i];
    }
    // Renormalize to ensure sum = 1
    const sum = adjustedWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = sum > 0 ? adjustedWeights.map(w => w / sum) : adjustedWeights.map(() => 1 / data.length);
    const allocatedBudget = normalizedWeights.map((w) => w * totalBudget);
    const btcBought = data.map((price, i) => (price > 0 ? allocatedBudget[i] / price : 0));
    return btcBought;
  }
  // Allocate budget proportionally to weights
  const allocatedBudget = weights.map((w) => w * totalBudget);
  // Calculate BTC bought each day
  const btcBought = data.map((price, i) => (price > 0 ? allocatedBudget[i] / price : 0));
  return btcBought;
}

// Add more models here as needed
export const dcaModels = {
  softmax: softmax,
  // futureModel: (zScores: number[]) => { ... },
};

// Run all models and return their results for leaderboard
export function getAllTunedDCAResults(
  priceData: number[],
  zScores: number[],
  budgetPerDay: number,
  windowSize: number,
  temperature: number = 1.0
): Record<string, number[]> {
  const results: Record<string, number[]> = {};
  for (const [name, model] of Object.entries(dcaModels)) {
    results[name] = calculateTunedDCA(priceData, zScores, budgetPerDay, windowSize, model, temperature);
  }
  return results;
} 