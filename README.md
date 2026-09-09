# IOL Portfolio Dashboard

React + TypeScript + Vite SPA with a Node/Express backend for managing an IOL account.

## Requirements
- Node.js 20+
- InvertirOnline API enabled for your account

## Run with Docker

Docker Compose mounts the source code into both containers, so frontend and backend changes reload without rebuilding images.

Create `server/.env` from `server/.env.example` and fill in `IOL_USERNAME` and `IOL_PASSWORD`.

```bash
docker compose up
```

Frontend: http://localhost:5173

Stop the environment with `Ctrl+C`. After changing dependencies, restart the services so `npm ci` runs again:

```bash
docker compose down
docker compose up
```

## Display units

Use the global dropdown to display monetary amounts in Argentine pesos (ARS), UVA, or US dollars (official exchange rate). Press `Alt+U` to switch to the next unit.

The backend exposes:
- GET /api/health
- GET /api/rates
- GET /api/portfolio/argentina
- GET /api/portfolio/estados-unidos
- GET /api/account
- GET /api/operaciones

It does not include buy/sell endpoints: this first version is read-only.
