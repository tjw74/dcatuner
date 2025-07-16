# Bitcoin Research Kit (BRK) API Guide

The Bitcoin Research Kit (BRK) API provides Bitcoin on-chain metrics with guaranteed time alignment. There are two interchangeable public endpoints:

- Default: https://bitcoinresearchkit.org
- Alternate: https://brk.openonchain.dev

## Primary Endpoint: `/api/vecs/query`

**For metrics + time data (recommended approach):**

```bash
# Get full history for multiple metrics with dates
curl "https://bitcoinresearchkit.org/api/vecs/query?index=dateindex&ids=date,close,realized-price,marketcap&format=json"

# Get last 100 days
curl "https://bitcoinresearchkit.org/api/vecs/query?index=dateindex&ids=date,close,realized-price&from=-100&format=json"
```

**Response format:**
```json
[
  ["2009-01-03", "2009-01-04", ...],  // dates (row 0)
  [0, 0, ...],                        // close prices (row 1)  
  [0, 0, ...],                        // realized prices (row 2)
  [0, 0, ...]                         // marketcap (row 3)
]
```

**Key benefits:**
- Row 0 = dates, rows 1+ = metrics in requested order
- Perfect alignment guaranteed across all metrics
- Single API call for multiple metrics
- No `from` parameter = full history
- Add any metrics to `ids=` comma-separated

## Available Metrics

```bash
# List all available metrics
curl "https://bitcoinresearchkit.org/api/vecs/ids"
```

Common metrics: `close`, `realized-price`, `marketcap`, `realized-cap`, `200d-sma`, `true-market-mean`, `vaulted-price`, `liveliness`, etc.

## Parameters

- `index=dateindex` - Use date-based indexing
- `ids=date,metric1,metric2` - Always include `date` first, then your metrics
- `from=-N` - Get last N days (optional, omit for full history)
- `format=json` - Response format (json, csv, tsv, md)

## Legacy Endpoints (Individual Metrics)

```bash
# Get single metric
curl "https://bitcoinresearchkit.org/api/vecs/dateindex-to-close?from=-10"

# Get dates separately  
curl "https://bitcoinresearchkit.org/api/vecs/dateindex-to-date?from=-10"
```

**Note:** Use `/api/vecs/query` for multiple metrics to ensure perfect alignment. 