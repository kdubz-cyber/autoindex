# AutoIndex

AutoIndex full-stack app with React + TypeScript frontend and Node/Express auth backend.

## Features

- New guided flow: `Select Part -> Paste Link -> Analyse -> Results`
- Mobile-first stepper UI for Marketplace Analysis
- Privacy (`/privacy`) and Terms (`/terms`) pages
- Embed mode for Wix iframes via `?embed=1`
- Legacy full workspace preserved at `/workspace`
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

Default admin credentials are seeded in local development only:

- Username: `sino0491`
- Password: `Ktrill20!`

In production, set all of these environment variables:

- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

For Facebook Marketplace intelligence search, also set:

- `META_CL_ACCESS_TOKEN` (Meta Content Library API token)
- `META_CL_BASE_URL` (optional override, default `https://graph.facebook.com/v22.0`)
- `VITE_API_BASE_URL` in frontend build environment (URL of your deployed backend, e.g. `https://api.autoindex.com`)

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

Example:

```bash
SESSION_SECRET=replace-me META_CL_ACCESS_TOKEN=replace-me npm run server
```

For local frontend to call local backend:

```bash
VITE_API_BASE_URL=http://localhost:3001 npm run dev
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

For deployment modes (GitHub Pages base path, root domain, Wix embed), see `README_DEPLOY.md`.

## Deployment note

GitHub Pages is static-only and cannot run the Node auth server. For secure backend auth, deploy to a platform that supports Node servers (Render, Railway, Fly.io, Vercel with server routes, etc.).

### End-to-end production setup (GitHub Pages + API)

1. Deploy backend using `render.yaml`.
2. In Render, set:
   - `META_CL_ACCESS_TOKEN`
   - `ALLOWED_ORIGINS=https://kdubz-cyber.github.io`
   - `ADMIN_USERNAME=<your-admin-username>`
   - `ADMIN_PASSWORD=<strong-admin-password>`
   - `SESSION_SECRET=<long-random-secret>`
3. In GitHub repo settings, add secret:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
4. Re-run `Deploy to GitHub Pages` workflow.
5. Verify:
   - `https://<backend>/api/system/status` returns `metaMarketplaceConfigured: true`
   - AutoIndex Marketplace search no longer shows backend/token warnings.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express
- bcryptjs
- jsonwebtoken
