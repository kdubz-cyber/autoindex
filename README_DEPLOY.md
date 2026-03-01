# AutoIndex Deployment Guide

Last updated: February 28, 2026

## 1) Build and Preview

```bash
npm install
npm run build
npm run preview
```

## 2) Base Path Strategy

AutoIndex uses `VITE_BASE_PATH` at build time.

- GitHub Pages project site: `VITE_BASE_PATH=/autoindex/`
- Root path/custom domain: `VITE_BASE_PATH=/`

`vite.config.ts` reads this value and sets `base` automatically.

## 3) GitHub Pages Deployment

Use the existing GitHub Actions workflow. Ensure build env includes:

- `VITE_BASE_PATH=/autoindex/`
- `VITE_API_BASE_URL=https://<your-api-domain>` (optional; omit for template mode)

Live URL format:

- `https://<org-or-user>.github.io/autoindex/`

## 4) Custom Domain Deployment

Deploy the generated `dist/` to your host with:

- `VITE_BASE_PATH=/`

Examples:

- Netlify
- Vercel static
- Cloudflare Pages
- Render static site

## 5) Wix External Hosting + Domain Connection

Recommended approach:

1. Host AutoIndex externally (not inside Wix servers).
2. Point your Wix-managed domain/subdomain DNS to the external host.
3. Set `VITE_BASE_PATH=/`.
4. Keep backend API on a separate service and set `VITE_API_BASE_URL`.

## 6) Wix Embed Mode (iframe)

AutoIndex supports embed mode via query param:

- `?embed=1`

Example:

- `https://your-domain.com/analysis?embed=1`

Embed mode behavior:

- Hides top nav and footer
- Reduces page padding
- Keeps analysis flow usable in constrained iframe layouts

## 7) Backend Notes

If backend is not configured, guest browsing and marketplace analysis still work, but secure login/signup is disabled.

For connected backend mode, set:

- `VITE_API_BASE_URL` (frontend)
- `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (backend)
- `APP_BASE_URL` (frontend URL used in verification email links)
- `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (email verification delivery)
- `PASSWORD_MIN_LENGTH` and `EMAIL_VERIFY_TOKEN_TTL_HOURS` (optional auth policy tuning)
- `ALLOWED_ORIGINS` to include your frontend domain
- `META_CL_ACCESS_TOKEN` for Facebook Marketplace API integration
