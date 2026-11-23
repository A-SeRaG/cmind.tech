# CMind LMS

Multi-school learning platform for students aged 9-18 (Arabic/English, RTL).
The web app still runs on **mock data in the browser**; the backend (Postgres + RLS + real auth) is being built phase by phase.

## Structure

```
apps/web/            React 19 + Vite + TypeScript + Tailwind/shadcn UI
apps/api/            Express API (health, security middleware, config validation; routes arrive in Phase 1)
packages/shared/     Zod schemas and rules shared by web and api (roles, points)
supabase/            Database: migrations, RLS, points functions, seed, tests (see supabase/README.md)
tests/load/          k6 load test
.github/workflows/   CI: build, typecheck, test on every PR
```

## Run

```bash
npm install
npm run dev:web      # http://localhost:5173
npm run dev:api      # http://localhost:4000/health
npm run typecheck && npm test
npm run test:db      # needs Postgres; see supabase/README.md
```

Copy `.env.example` to `.env` (never commit it). Demo logins in the web app are mock only: `student@cmind.tech`, `teacher@cmind.tech`, `admin@cmind.tech`.

## Roles and landing routes

`super_admin` -> `/platform`, `school_admin` -> `/school`, `instructor` -> `/teach`, `student` -> `/learn`, `parent` -> `/family`.
Route guards in the web app are UX only. Access is enforced by the API and Postgres RLS.

## Points and badges

| Action | Points |
|---|---|
| Full mark (100%) on an assessment submitted on or before the deadline | +10 |
| Open a video (first time) | +5 |
| Open an article (first time) | +5 |

Values are editable by admins. Badges are computed from the point log and track progress.

## Roadmap

0. Foundations: repo structure, CI, API skeleton (done)
1. Database schema, RLS and points functions (done); real auth (next)
2. Role-based areas, replacing mock stores one at a time
3. Learning core: quizzes, grading, points and badges server-side
4. Pilot hardening: audit logs, backups, monitoring, load tests
