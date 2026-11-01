# PaperTree Admin

Admin panel for PaperTree Bangladesh. React 19, Vite, Tailwind CSS 4, TanStack Query, React Router.

## Run it

1. Start PostgreSQL and the API (see `papertree-backend/README.md`).
2. In this folder:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5173 and sign in.

In development the admin panel calls the API on its own address (`/v1/...`), and Vite forwards
those calls to `http://localhost:4000` (change with `API_PROXY_TARGET` in `.env`).

## Deploy (Cloudflare Workers)

The built panel is plain static files, served by Cloudflare for free (`wrangler.jsonc`).

1. In Cloudflare: **Workers & Pages > Create > Import a repository**, pick this repo.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. Add a build variable `VITE_API_URL` = `https://papertree-api.bitnbyteit.com`.
4. Add the custom domain `papertree-admin.bitnbyteit.com`.

The admin and the API must be on the same main domain (both on `bitnbyteit.com`).
Otherwise browsers block the sign-in cookie.

`public/_headers` keeps the panel out of search engines and caches built files for a year
(their names change on every build).

## Folder layout

```
src/
  components/ui/      shared building blocks (button, input, dialog, ...)
  components/layout/  sidebar, top bar, page header, access guards, menu list (nav.ts)
  hooks/              data hooks that call the API
  lib/                API client, types, helpers
  pages/              one file per page
  router.tsx          all routes
```

Adding a new section: add it to `components/layout/nav.ts`, then add its page to `router.tsx`.
