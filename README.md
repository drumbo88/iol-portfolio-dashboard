# IOL Portfolio Dashboard

React + TypeScript + Vite SPA with a Node/Express backend for managing an IOL account.

## Requirements
- Node.js 20+
- InvertirOnline API enabled for your account

## Run

```bash
cp server/.env.example server/.env
# fill in IOL_USERNAME and IOL_PASSWORD

npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Display units

Use the global dropdown to display monetary amounts in Argentine pesos (ARS), UVA, or US dollars (official exchange rate). Press `Alt+U` to switch to the next unit.

The backend exposes:
- GET /api/portfolio/argentina
- GET /api/portfolio/estados-unidos
- GET /api/account

It does not include buy/sell endpoints: this first version is read-only.
