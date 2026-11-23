# CMind LMS

Multi-school learning platform for students aged 9-18 (Arabic/English, RTL).
The web app currently runs on **mock data in the browser**. A real backend (Postgres + RLS + real auth) is the next phase.

## Structure

```
apps/web/        React 19 + Vite + TypeScript + Tailwind/shadcn UI
  src/pages/       one file per screen
  src/store/       Zustand stores (auth, data, gamification, theme, language)
  src/data/        mock curriculum (tracks, lessons, milestones)
  src/lib/         pure logic (points, badges, progress)
  src/types/       shared TypeScript types
  src/i18n/        en.json / ar.json
tests/load/      k6 load test
```

## Run

```bash
cd apps/web && npm install && npm run dev
```

Demo logins: `student@cmind.tech`, `teacher@cmind.tech`, `admin@cmind.tech` (mock only).

## Points and badges

| Action | Points |
|---|---|
| Full mark (100%) on an assessment, submitted on or before the deadline | +10 |
| Open a video (first time) | +5 |
| Open an article (first time) | +5 |

Values are editable by the admin at **Points Control**. Badges are computed from the point log and track progress.
Admins can add or remove points with a reason, revoke any entry, and edit tracks, lessons, assessments, and final milestones at **Curriculum**.
