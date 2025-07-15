// Central config for all available and derived metrics
// Add new metrics here as needed

export const METRICS_LIST = [
  'close',
  'realized-price',
  '200d-sma',
  'true-market-mean',
  'vaulted-price',
  'marketcap',
  'realized-cap',
  'adjusted-spent-output-profit-ratio',
  'sell-side-risk-ratio',
  'liveliness',
  'short-term-holders-supply',
  'short-term-holders-utxo-count',
  'short-term-holders-realized-cap',
  'short-term-holders-realized-price-ratio',
  'short-term-holders-realized-profit',
  'short-term-holders-negative-realized-loss',
  'short-term-holders-adjusted-spent-output-profit-ratio',
  'short-term-holders-unrealized-profit',
  'short-term-holders-negative-unrealized-loss',
  'short-term-holders-coinblocks-destroyed',
];

// Derived metrics with formulas
export const DERIVED_METRICS = [
  {
    name: 'MVRV Ratio',
    formula: (metrics: Record<string, number[]>) => {
      const mc = metrics['marketcap'];
      const rc = metrics['realized-cap'];
      if (!mc || !rc || mc.length !== rc.length) return [];
      return mc.map((v, i) => (rc[i] !== 0 ? v / rc[i] : NaN));
    },
  },
  {
    name: 'Mayer Multiple',
    formula: (metrics: Record<string, number[]>) => {
      const price = metrics['close'];
      const sma = metrics['200d-sma'];
      if (!price || !sma || price.length !== sma.length) return [];
      return price.map((v, i) => (sma[i] !== 0 ? v / sma[i] : NaN));
    },
  },
]; 