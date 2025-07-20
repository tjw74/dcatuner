// Debug script to identify the ranking page calculation bug

console.log("=== RANKING PAGE BUG INVESTIGATION ===");
console.log("");

// Simulate the buggy calculation from the ranking page
function simulateRankingPageBug() {
  // Constants from the ranking page
  const DCA_BUDGET = 10;
  const dcaWindow = 1460; // 4 years
  const zScoreWindow = 1460;
  
  // Simulate realistic data lengths (likely much shorter than 1460 days)
  const realisticDataLength = 500; // Much shorter than 1460
  const price = Array(realisticDataLength).fill(0).map((_, i) => 50000 + i * 10); // Simulate BTC prices
  const metricData = Array(realisticDataLength).fill(0).map((_, i) => 100 + i * 0.1); // Some metric
  
  console.log("Data simulation:");
  console.log(`  Price array length: ${price.length}`);
  console.log(`  Metric array length: ${metricData.length}`);
  console.log(`  DCA window: ${dcaWindow} days`);
  console.log(`  Z-score window: ${zScoreWindow} days`);
  console.log("");
  
  // The bug: priceWindow calculation
  const priceWindow = price.slice(-dcaWindow);
  console.log("BUG IDENTIFIED:");
  console.log(`  price.slice(-${dcaWindow}) = price.slice(-${dcaWindow})`);
  console.log(`  Since ${price.length} < ${dcaWindow}, this returns the entire array`);
  console.log(`  priceWindow length: ${priceWindow.length}`);
  console.log(`  priceWindow === price: ${priceWindow === price}`);
  console.log("");
  
  // Calculate current price (this is where the bug manifests)
  const currentPrice = priceWindow[priceWindow.length - 1];
  console.log("Current price calculation:");
  console.log(`  currentPrice = priceWindow[${priceWindow.length - 1}]`);
  console.log(`  currentPrice = $${currentPrice}`);
  console.log(`  This is the LAST price in the entire dataset, not the last price in the DCA window`);
  console.log("");
  
  // Simulate the DCA calculations
  const regDca = calculateRegularDCA(price, DCA_BUDGET, dcaWindow);
  const regBtc = regDca.reduce((a, b) => a + b, 0);
  const tunedDca = calculateTunedDCA(price, [0.1, 0.2, 0.3, 0.4, 0.5], DCA_BUDGET, dcaWindow, softmax, 1.0);
  const tunedBtc = tunedDca.reduce((a, b) => a + b, 0);
  
  console.log("DCA calculations:");
  console.log(`  Regular DCA BTC: ${regBtc.toFixed(6)}`);
  console.log(`  Tuned DCA BTC: ${tunedBtc.toFixed(6)}`);
  console.log("");
  
  // Calculate USD values
  const regUsd = regBtc * currentPrice;
  const tunedUsd = tunedBtc * currentPrice;
  const totalInvestment = DCA_BUDGET * dcaWindow;
  
  console.log("USD calculations:");
  console.log(`  Regular USD: $${regUsd.toFixed(2)}`);
  console.log(`  Tuned USD: $${tunedUsd.toFixed(2)}`);
  console.log(`  Total investment: $${totalInvestment.toFixed(2)}`);
  console.log("");
  
  // Calculate profits
  const profit = Math.round(((tunedUsd - totalInvestment) / totalInvestment) * 100);
  const regProfit = Math.round(((regUsd - totalInvestment) / totalInvestment) * 100);
  
  console.log("Profit calculations:");
  console.log(`  Tuned profit: ${profit}%`);
  console.log(`  Regular profit: ${regProfit}%`);
  console.log(`  Both are likely -100% because totalInvestment is huge (${totalInvestment})`);
  console.log("");
  
  return { profit, regProfit, currentPrice, totalInvestment };
}

// Helper functions
function calculateRegularDCA(priceData, budgetPerDay, windowSize) {
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  return data.map((price) => {
    if (price <= 0) return 0;
    return budgetPerDay / price;
  });
}

function calculateTunedDCA(priceData, zScores, budgetPerDay, windowSize, model, temperature = 1.0) {
  const data = windowSize === Infinity ? priceData : priceData.slice(-windowSize);
  const z = windowSize === Infinity ? zScores : zScores.slice(-windowSize);
  const weights = model(z, temperature);
  
  if (weights.length !== data.length) {
    const adjustedWeights = Array(data.length).fill(0);
    for (let i = 0; i < Math.min(weights.length, data.length); i++) {
      adjustedWeights[i] = weights[i];
    }
    const sum = adjustedWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = sum > 0 ? adjustedWeights.map(w => w / sum) : adjustedWeights.map(() => 1 / data.length);
    
    return data.map((price, i) => {
      if (price <= 0) return 0;
      const weight = normalizedWeights[i];
      const dailySpend = budgetPerDay * weight;
      return dailySpend / price;
    });
  }
  
  return data.map((price, i) => {
    if (price <= 0) return 0;
    const weight = weights[i];
    const dailySpend = budgetPerDay * weight;
    return dailySpend / price;
  });
}

function softmax(zScores, temperature = 1.0) {
  if (!Array.isArray(zScores) || zScores.length === 0) return [];
  if (temperature <= 0) {
    throw new Error('Temperature must be positive');
  }
  
  const validScores = zScores.map((z) => (isFinite(z) ? z / temperature : 0));
  const max = Math.max(...validScores);
  const expScores = validScores.map((z) => Math.exp(z - max));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  
  return expScores.map((e) => (sumExp === 0 ? 0 : e / sumExp));
}

// Run the simulation
const result = simulateRankingPageBug();

console.log("=== ROOT CAUSE ANALYSIS ===");
console.log("");
console.log("The bug is in this line:");
console.log("  const currentPrice = priceWindow[priceWindow.length - 1];");
console.log("");
console.log("Where:");
console.log("  priceWindow = price.slice(-dcaWindow)");
console.log("  dcaWindow = 1460 (4 years)");
console.log("  But price.length < 1460, so priceWindow = price (entire array)");
console.log("");
console.log("This means:");
console.log("  1. currentPrice is the LAST price in the entire dataset");
console.log("  2. totalInvestment = DCA_BUDGET * dcaWindow = $10 * 1460 = $14,600");
console.log("  3. But the actual investment period is much shorter");
console.log("  4. This causes all profits to be -100% because totalInvestment is artificially inflated");
console.log("");
console.log("=== FIX REQUIRED ===");
console.log("Change line 314 from:");
console.log("  const currentPrice = priceWindow[priceWindow.length - 1];");
console.log("To:");
console.log("  const currentPrice = price[price.length - 1];");
console.log("Or better yet:");
console.log("  const currentPrice = price.slice(-Math.min(dcaWindow, price.length))[price.slice(-Math.min(dcaWindow, price.length)).length - 1];"); 