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

The admin panel calls the API on its own address (`/v1/...`). In development Vite forwards
those calls to `http://localhost:4000` (change with `API_PROXY_TARGET` in `.env`).
On Vercel, a rewrite will forward them to the API the same way.

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
