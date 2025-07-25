// DCA module: regular DCA, tuned DCA, and models

import { softmax } from './models/softmax';

// Regular DCA calculation - buy exactly $10 worth of BTC each day
export function calculateRegularDCA(
  priceData: number[],
  budgetPerDay: number,
  windowSize: number
): number[] {
  // Only consider the last windowSize days
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  
  // Each day buys exactly $10 worth of BTC
  const btcBought = data.map((price) => {
    if (price <= 0) return 0;
    return budgetPerDay / price; // BTC = $10 / price
  });
  
  return btcBought;
}

// Softmax model for allocation weights
export function softmaxModel(zScores: number[], temperature: number = 1.0): number[] {
  return softmax(zScores, temperature);
}

// Tuned DCA calculation - buy variable amounts based on z-scores, but average $10/day
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
  
  // Debug: Log what we're working with
  console.log('DCA Debug:', {
    dataLength: data.length,
    zScoresLength: z.length,
    weightsLength: weights.length,
    budgetPerDay,
    windowSize,
    temperature,
    zScoresSample: z.slice(0, 5),
    weightsSample: weights.slice(0, 5),
    weightsSum: weights.reduce((a, b) => a + b, 0),
    dataSample: data.slice(0, 5)
  });
  
  // Additional debug for weights
  console.log('Weights Debug:', {
    weightsLength: weights.length,
    weightsSum: weights.reduce((a, b) => a + b, 0),
    weightsRange: `${Math.min(...weights).toFixed(6)} to ${Math.max(...weights).toFixed(6)}`,
    sampleWeights: weights.slice(0, 10).map(w => w.toFixed(6))
  });
  
  // Ensure weights array matches data length
  if (weights.length !== data.length) {
    console.error('Weight length mismatch:', { weightsLength: weights.length, dataLength: data.length });
    // Handle weight array length mismatch gracefully
    const adjustedWeights = Array(data.length).fill(0);
    for (let i = 0; i < Math.min(weights.length, data.length); i++) {
      adjustedWeights[i] = weights[i];
    }
    // Renormalize to ensure sum = 1
    const sum = adjustedWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = sum > 0 ? adjustedWeights.map(w => w / sum) : adjustedWeights.map(() => 1 / data.length);
    
    // Calculate total budget for the period
    const totalBudget = budgetPerDay * data.length;
    
    // Allocate the total budget across days based on weights
    const btcBought = data.map((price, i) => {
      if (price <= 0) return 0;
      const weight = normalizedWeights[i];
      const dailySpend = totalBudget * weight; // This ensures total spend = totalBudget
      return dailySpend / price; // BTC = dailySpend / price
    });
    
    console.log('DCA Results (mismatch case):', {
      sampleBTC: btcBought.slice(0, 5),
      totalBTC: btcBought.reduce((a, b) => a + b, 0),
      sampleSpending: btcBought.slice(0, 5).map((btc, i) => btc * data[i])
    });
    
    return btcBought;
  }
  
  // Calculate total budget for the period
  const totalBudget = budgetPerDay * data.length;
  
  // Allocate the total budget across days based on weights
  const btcBought = data.map((price, i) => {
    if (price <= 0) return 0;
    const weight = weights[i];
    const dailySpend = totalBudget * weight; // This ensures total spend = totalBudget
    return dailySpend / price; // BTC = dailySpend / price
  });
  
  // Verify total investment matches regular DCA exactly
  const totalInvestment = btcBought.reduce((sum, btc, i) => sum + (btc * data[i]), 0);
  const expectedInvestment = budgetPerDay * data.length;
  console.log('DCA Verification:', {
    totalInvestment: totalInvestment.toFixed(2),
    expectedInvestment: expectedInvestment.toFixed(2),
    difference: (totalInvestment - expectedInvestment).toFixed(2),
    budgetMatch: Math.abs(totalInvestment - expectedInvestment) < 0.01 ? '✅ EXACT MATCH' : '❌ MISMATCH',
    averageDailySpend: (totalInvestment / data.length).toFixed(2),
    weightsSum: weights.reduce((a, b) => a + b, 0).toFixed(6),
    sampleWeights: weights.slice(0, 5).map(w => w.toFixed(6)),
    sampleSpending: btcBought.slice(0, 5).map((btc, i) => (btc * data[i]).toFixed(2)),
    sampleBTC: btcBought.slice(0, 5).map(btc => btc.toFixed(6)),
    totalBTC: btcBought.reduce((a, b) => a + b, 0).toFixed(6)
  });
  
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