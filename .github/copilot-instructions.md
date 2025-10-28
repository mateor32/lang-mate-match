## Copilot instructions for this repository

Purpose: make AI coding agents immediately productive in this repo by calling out architecture, dev workflows, conventions, and concrete examples.

- Big picture
  - Frontend: Vite + React + TypeScript. UI uses shadcn-ui components under `src/components/ui/` and a path alias `@` -> `./src` (see `vite.config.ts`). The router is mounted in `src/main.tsx` (BrowserRouter) and routes live in `src/App.tsx` (uses `Routes`/`Route`). React Query is used (`@tanstack/react-query`) — see `src/App.tsx` for QueryClient setup.
  - Backend: An Express API in `backend/server.js` using `pg` for Postgres and `socket.io` for realtime. Database pool is defined in `backend/db.js`. Routes are mounted under `/api/*` (example: `/api/usuarios`, `/api/matches`, `/api/auth/google`).

- Quick dev commands (discovered in repo)
  - Frontend (from repo root):
    - Install deps: `npm install`
    - Dev server: `npm run dev` (starts Vite — configured in `vite.config.ts` to serve on port 8080)
    - Build: `npm run build` and `npm run preview`
    - Lint: `npm run lint`
  - Backend: there is no `start` script in `backend/package.json`; the express app listens on port 5000 (see `backend/server.js`). To run locally you can:
    - `node backend/server.js` (verify Node supports ESM) or
    - add `"type":"module"` to `backend/package.json` or create a `start` script (agent may propose this change and must open a short PR with tests if relevant).

- Network & runtime details agents must know
  - Frontend dev server: port 8080 (see `vite.config.ts`).
  - Backend API server: port 5000 (see `backend/server.js`). CORS is enabled in the backend.
  - DB: `backend/db.js` exports a `Pool` configured with local Postgres credentials (user: `postgres`, db: `linguamatch`, password: `password`, host: `localhost`, port: `5432`). SQL schema files are not in repo — be cautious when running DB-dependent endpoints.
  - Google OAuth: client ID is hard-coded in `src/main.tsx` and `backend/controllers/authController.js`. The auth endpoint is `POST /api/auth/google` and expects `{ token }` in the body.

- Conventions & patterns (do not invent alternatives)
  - UI components follow shadcn patterns: `src/components/ui/*` contains small, reusable primitives (Button, Input, Toaster). Reuse them rather than creating ad-hoc components.
  - Path alias `@` is used widely (`@/components/...`) — keep imports aligned with it.
  - Routing: use `BrowserRouter` in `src/main.tsx` and declare routes in `src/App.tsx` (do not add extra routers).
  - State/data fetching: prefer `@tanstack/react-query` for server data; see `App.tsx` for QueryClient wiring.

- Endpoints & SQL surfaces to inspect when modifying backend
  - `GET /api/usuarios` — implemented in `backend/server.js` with joined queries to `usuario_idioma` and `intereses`.
  - `GET /api/usuarios/:id` — returns a single usuario with `idiomas` (see `server.js`).
  - `GET /api/idiomas` and `GET /api/usuario_idioma` — helper endpoints exist in `server.js`.
  - `POST /api/auth/google` — handled by `backend/controllers/authController.js` which uses `google-auth-library` and `backend/db.js`.

- Small, actionable rules for AI agents (follow these when editing)
  1. When changing import styles, keep the `@` alias and TypeScript `.tsx` extensions consistent with the codebase.
 2. If you change backend startup or module system, update `backend/package.json` scripts and add `type: "module"` if you introduce/modify ESM imports — include a short note in the PR explaining why.
 3. Do not commit secrets: the repo currently contains hard-coded Google client IDs and DB password in `backend/db.js` — flag these and open an issue/PR proposing `.env` usage and `dotenv` wiring instead.
 4. Tests are not present; small code changes should include basic unit tests where feasible and a short manual verification step in the PR description.

- Where to look first (file pointers)
  - Frontend entry + routing: `src/main.tsx`, `src/App.tsx`
  - Chat UI and components: `src/components/ChatWindow.tsx`, `src/components/ChatList.tsx`
  - UI primitives: `src/components/ui/*`
  - Vite config & alias: `vite.config.ts`
  - Backend server and DB: `backend/server.js`, `backend/db.js`, `backend/controllers/*`
  - Package manifests: `package.json` (root) and `backend/package.json`

If anything in this file is unclear or if you want the agent to prefer a different way of running the backend (for example, create an npm `start` script or use `nodemon`), tell me and I'll update this doc and add a small PR to implement the change.
