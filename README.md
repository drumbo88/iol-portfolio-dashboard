# IOL Portfolio Dashboard

SPA React + TypeScript + Vite con backend Node/Express que mantiene las credenciales de IOL fuera del navegador.

## Requisitos
- Node.js 20+
- API de InvertirOnline habilitada para tu cuenta

## Ejecutar

```bash
cp server/.env.example server/.env
# completar IOL_USERNAME e IOL_PASSWORD

npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

El backend expone:
- GET /api/portfolio/argentina
- GET /api/portfolio/estados-unidos
- GET /api/account

No incluye endpoints de compra/venta: esta primera versión es de solo lectura.
