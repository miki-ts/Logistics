# YM Logistics Admin (isolated)

This is a separate Node.js service. It does not modify, load, or serve the public YM Logistics site.

## Start

1. Copy `.env.example` to `.env`, then set secrets as described there.
2. In PowerShell, load the values into the process environment (or use your deployment secret manager).
3. Run `node server.js` from this directory and open `http://localhost:8787`.

The provided static public site has no backend, API, database, or persisted quote/contact submission data. Therefore the dashboard deliberately reports no connected data source and contains no invented records. `GET /api/overview` is the isolated, authenticated integration seam for a future read-only data adapter.

For production, run behind HTTPS and inject `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` through the host's secret manager. Do not use the example placeholders.
