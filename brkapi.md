# Bitcoin Research Kit (BRK) API Guide

The DCA Tuner app uses the Bitcoin Research Kit (BRK) API to fetch Bitcoin on-chain metrics. There are two interchangeable public endpoints:

- Default: https://bitcoinresearchkit.org
- Alternate: https://brk.openonchain.dev

Both endpoints provide identical data and can be swapped in the app settings.

## Key Endpoints

- `GET /version` — Returns the BRK server version.
- `GET /api/vecs/indexes` — Lists all available indexes (e.g., dateindex, weekindex, height, etc.).
- `GET /api/vecs/ids` — Lists all available vector IDs (e.g., close, open, ohlc, supply, etc.).
- `GET /api/vecs/{INDEX}-to-{ID}` — Retrieves data for a specific index and ID. Supports pagination and format options.
- `GET /api/vecs/query` — Flexible query for one or more vector IDs and indexes.

## Example curl Commands

```sh
# Get server version
curl https://bitcoinresearchkit.org/version
curl https://brk.openonchain.dev/version

# List all indexes
curl https://bitcoinresearchkit.org/api/vecs/indexes
curl https://brk.openonchain.dev/api/vecs/indexes

# List all vector IDs
curl https://bitcoinresearchkit.org/api/vecs/ids
curl https://brk.openonchain.dev/api/vecs/ids

# Get last 10 closing prices
curl "https://bitcoinresearchkit.org/api/vecs/date-to-close?from=-10"
curl "https://brk.openonchain.dev/api/vecs/date-to-close?from=-10"
```

## Notes
- Both endpoints return the same data and are functionally identical.
- The default data source is https://bitcoinresearchkit.org, but users can switch to https://brk.openonchain.dev in the app settings.
- All endpoints support pagination and multiple formats (json, csv, tsv, md).
- The API is robust and suitable for real-time and historical Bitcoin on-chain data queries. 