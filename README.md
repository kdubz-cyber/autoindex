# AutoIndex

AutoIndex full-stack app with React + TypeScript frontend and Node/Express auth backend.

## Features

- F.P.V (Fair Parts Valuation Formula) valuation workflow
- Multi-vendor marketplace with filtering and sorting
- Individual and vendor listing flows
- Role-based auth: `individual`, `vendor`, `admin`
- Vendor dashboard (daily/weekly/monthly sales + customer feedback)
- Website admin dashboard (daily/weekly/monthly totals by source)
- Marketplace analysis panel (MVP simulated intelligence)
- Persistent local state for marketplace interactions + backend session auth

## Secure auth backend

Backend auth uses:

- Password hashing with `bcryptjs`
- Signed session tokens with `jsonwebtoken`
- HttpOnly session cookies (`ai_session`)

Default admin credentials:

- Username: `sino0491`
- Password: `Ktrill20!`

Set `SESSION_SECRET` in production.

## Run locally

Requires Node.js 20+.

1. Install dependencies:

```bash
npm install
```

2. Start backend API:

```bash
npm run server
```

3. In a second terminal, start frontend:

```bash
npm run dev
```

Open the local URL shown by Vite (typically `http://localhost:5173`).

## Build frontend

```bash
npm run build
npm run preview
```

## Deployment note

GitHub Pages is static-only and cannot run the Node auth server. For secure backend auth, deploy to a platform that supports Node servers (Render, Railway, Fly.io, Vercel with server routes, etc.).

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express
- bcryptjs
- jsonwebtoken
