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

// User-friendly display names for metrics
export const METRIC_DISPLAY_NAMES: Record<string, string> = {
  'close': 'Bitcoin Price',
  'realized-price': 'Realized Price',
  '200d-sma': '200-Day SMA',
  'true-market-mean': 'True Market Mean',
  'vaulted-price': 'Vaulted Price',
  'marketcap': 'Market Cap',
  'realized-cap': 'Realized Cap',
  'adjusted-spent-output-profit-ratio': 'Adjusted SOPR',
  'sell-side-risk-ratio': 'Sell-Side Risk',
  'liveliness': 'Liveliness',
  'short-term-holders-supply': 'STH Supply',
  'short-term-holders-utxo-count': 'STH UTXO Count',
  'short-term-holders-realized-cap': 'STH Realized Cap',
  'short-term-holders-realized-price-ratio': 'STH Realized Price Ratio',
  'short-term-holders-realized-profit': 'STH Realized Profit',
  'short-term-holders-negative-realized-loss': 'STH Realized Loss',
  'short-term-holders-adjusted-spent-output-profit-ratio': 'STH Adjusted SOPR',
  'short-term-holders-unrealized-profit': 'STH Unrealized Profit',
  'short-term-holders-negative-unrealized-loss': 'STH Unrealized Loss',
  'short-term-holders-coinblocks-destroyed': 'STH Coinblocks Destroyed',
};

// Helper function to get display name for any metric
export function getMetricDisplayName(metric: string): string {
  return METRIC_DISPLAY_NAMES[metric] || metric;
}

// Derived metrics with formulas
export const DERIVED_METRICS = [
  {
    name: 'MVRV Ratio',
    formula: (metrics: Record<string, number[]>) => {
      const mc = metrics['marketcap'];
      const rc = metrics['realized-cap'];
      if (!mc || !rc || mc.length !== rc.length) return [];
      return mc.map((v, i) => {
        if (typeof v !== 'number' || typeof rc[i] !== 'number' || isNaN(v) || isNaN(rc[i]) || rc[i] === 0) {
          return NaN;
        }
        return v / rc[i];
      });
    },
  },
  {
    name: 'Mayer Multiple',
    formula: (metrics: Record<string, number[]>) => {
      const price = metrics['close'];
      const sma = metrics['200d-sma'];
      if (!price || !sma || price.length !== sma.length) return [];
      return price.map((v, i) => {
        if (typeof v !== 'number' || typeof sma[i] !== 'number' || isNaN(v) || isNaN(sma[i]) || sma[i] === 0) {
          return NaN;
        }
        return v / sma[i];
      });
    },
  },
]; 