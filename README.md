# Lingo Path

Lingo Path is a Duolingo-inspired English-to-Spanish learning app built as a full-stack project. Learners follow a winding skill path, complete short lessons with different exercise formats, and track progress through a gamified interface.

- **Live demo:** [https://lingo-path-virid.vercel.app/](https://lingo-path-virid.vercel.app/)
- **Backend health check:** [https://lingo-path.onrender.com/health](https://lingo-path.onrender.com/health)
- **Source repository:** [https://github.com/Raymind2k/Lingo-path](https://github.com/Raymind2k/Lingo-path)

The stable Vercel domain above is the public demo link. Vercel also creates preview/deployment-specific URLs; the backend CORS allowlist is configured for the stable domain, so use that domain when evaluating the app.

## Features

- **Learning path:** Seven course units, with ten skill nodes per unit. Nodes display locked, available, and completed states, and completing skills advances learner progress.
- **Varied lessons:** Multiple choice, typed translation, word-bank, matching, and fill-in-the-blank exercises. Content is seeded in the backend database.
- **Lesson feedback:** Answer checking, correct/incorrect feedback, explanations, hearts, heart regeneration, and lesson completion rewards.
- **Progress and rewards:** XP totals, daily XP goal, streaks, skill completion, quests, achievements, a sample leaderboard, gems, and chest rewards.
- **Browser-specific learner:** A browser profile gets its own anonymous learner. Returning to that browser resumes its backend-stored progress; a different browser starts a separate learner.
- **Responsive experience:** Desktop, tablet, and mobile layouts, with responsive navigation, learning path, and lesson controls.
- **Theme preference:** Light/dark preference is kept in that browser.
- **Main sections:** Learn, Practice, Leaderboards, Quests, Shop, Profile, and More/settings.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript 5 |
| Styling | CSS in `frontend/app/globals.css` |
| Backend | Python 3.10+, FastAPI |
| ORM and database | SQLAlchemy, SQLite |
| Schema migrations | Alembic |
| Frontend hosting | Vercel |
| Backend hosting | Render (free web service) |

Next.js 16 requires Node.js 20.9 or newer. The backend uses Python 3.10 or newer.

## Architecture and data flow

```text
Learner's browser
  ├─ Next.js UI (Vercel; frontend/)
  │    ├─ Learn path and lesson player: frontend/app/page.tsx
  │    ├─ Secondary pages: frontend/app/{practice,leaderboards,quests,shop,profile,more}/
  │    ├─ Browser learner ID: frontend/app/browserLearner.ts
  │    └─ Theme, gems, and chest display state: browser localStorage
  │
  │    JSON requests to NEXT_PUBLIC_API_URL
  ▼
FastAPI API (Render; backend/app/main.py)
  ├─ /health
  ├─ /profile (bootstrap, stats, heart refill)
  ├─ /path (course and learner skill progress)
  ├─ /lessons (lesson content and answer submission)
  └─ /leaderboard (learner and seeded sample learners)
  │
  │ SQLAlchemy sessions
  ▼
SQLite database (path selected by DATABASE_URL)
  ├─ Course content and exercises
  ├─ Anonymous learner profiles and stats
  ├─ Skill completion and daily activity
  └─ Exercise attempts
```

The frontend reads `NEXT_PUBLIC_API_URL` when it is built. It sends browser requests directly to FastAPI; the API uses `CORS_ORIGINS` to allow the deployed frontend origin. There is no Next.js API proxy or separate authentication service.

On first use, the frontend creates a UUID and saves it under `lingo-path-browser-id` in localStorage. It sends that UUID to `POST /profile/bootstrap`. FastAPI derives a unique anonymous username from the UUID and creates the learner and initial skill-progress rows. The UUID stays in that browser profile, while XP, hearts, streaks, attempts, and course progress are stored by the backend in SQLite. A different browser profile receives a different UUID and learner.

The browser also stores presentation-only state such as theme selection and demo gem/chest claims. These client-side values are separate from learner XP and lesson progress.

## Database schema

Alembic migrations define the database schema. SQLAlchemy models are in `backend/app/models/`.

```text
COURSES 1 ──< UNITS 1 ──< SKILLS 1 ──< LESSONS 1 ──< EXERCISES
USERS 1 ──1 USER_STATS
USERS 1 ──< USER_SKILL_PROGRESS >──1 SKILLS
USERS 1 ──< DAILY_ACTIVITY
USERS 1 ──< EXERCISE_ATTEMPTS >──1 EXERCISES
```

`1 ──<` means one-to-many; `1 ──1` means one-to-one.

| Table | Purpose and key fields |
| --- | --- |
| `courses` | Course slug, name, source language, and target language. |
| `units` | Ordered course sections with titles and descriptions. |
| `skills` | Ordered skill nodes within a unit. |
| `lessons` | Lessons associated with a skill and their XP reward. |
| `exercises` | Ordered lesson questions, type, prompt, JSON configuration, and explanation. |
| `users` | Anonymous learner username, display name, timezone, and creation time. |
| `user_stats` | Total XP, current/longest streak, hearts, daily goal, and heart-regeneration time. |
| `user_skill_progress` | Per-learner skill status, crowns, and completion time. |
| `daily_activity` | Per-learner, per-day XP earned and lessons completed. |
| `exercise_attempts` | Submitted answer, correctness, XP awarded, and timestamp. |

Exercise-specific configuration is stored as JSON. For example, a multiple-choice exercise stores its choices and correct answer; a matching exercise stores the pairs. Answer keys are not returned when the frontend fetches a lesson. Migrations are in `backend/migrations/versions/`.

## Run locally

You need Git, Python 3.10+, Node.js 20.9+, and npm. Run the backend and frontend in separate terminals.

### 1. Set up the backend

From the repository root in PowerShell:

```powershell
Set-Location .\backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
python -m app.db.seed_leaderboard
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API runs at <http://127.0.0.1:8000>. Interactive API documentation is at <http://127.0.0.1:8000/docs>. The seed command creates the Spanish course, expands it to seven units with ten skill nodes each, and prepares the demo learner. The leaderboard seed creates example competitors. It resets those sample competitors' XP, streak, hearts, and daily goal when rerun.

If PowerShell blocks virtual-environment activation, allow it for this terminal only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 2. Set up the frontend

In a second terminal from the repository root:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` for the backend. To override it, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then open <http://localhost:3000>.

### Production build

From `frontend/`, run:

```powershell
npm run build
npm run start
```

The production build was verified locally after removing a build-time Google Fonts import that failed on Vercel. The stylesheet uses an Arial/Helvetica system font stack and does not need a network font download.

## Deployment configuration

### Render API

The FastAPI service is deployed at <https://lingo-path.onrender.com> and its `/health` endpoint returns `{"status":"ok"}`.

For a monorepo Render Web Service, use `backend` as the root directory, install dependencies with `pip install -r requirements.txt`, and start the app with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Apply the Alembic migrations and seed the course/leaderboard data before the first use. The app accepts these environment variables:

| Variable | Example/value | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:////tmp/lingo_path.db` on the current free demo | SQLAlchemy database connection. |
| `CORS_ORIGINS` | `https://lingo-path-virid.vercel.app` | Comma-separated frontend origins permitted to call the API. |

Render's free service has an ephemeral filesystem and spins down after inactivity. Without a persistent disk or an external database, SQLite data can be lost on restart/redeployment, and the first request after inactivity can be slow while the service wakes. This is acceptable for the submitted demo but should be changed for durable production use.

### Vercel frontend

The frontend is deployed at <https://lingo-path-virid.vercel.app/>. Import the GitHub repository into Vercel, set **Root Directory** to `frontend`, and use the Next.js preset. Set the following environment variable for the **Production** environment, then redeploy:

```env
NEXT_PUBLIC_API_URL=https://lingo-path.onrender.com
```

This is a public frontend configuration value, not a secret. Vercel preview URLs are different origins; because the current Render CORS allowlist contains the stable production domain, preview deployments may show an API fetch error. Use the stable production URL for the demo and submission.

## API overview

All endpoints use JSON. A browser first bootstraps its learner, then uses the returned username for its requests.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check. |
| `POST` | `/profile/bootstrap` | Create or resolve the anonymous learner for a browser UUID. |
| `GET` | `/path/{username}` | Course units, skill nodes, lessons, and learner progress. |
| `GET` | `/lessons/{lesson_id}?username={username}` | Load lesson content and exercises without answer keys. |
| `POST` | `/lessons/{lesson_id}/answer` | Check an answer and record the attempt/progress updates. |
| `GET` | `/profile/{username}` | Learner stats, heart timer, daily activity, quests, and achievements. |
| `POST` | `/profile/{username}/refill-hearts` | Demo heart-refill action. |
| `GET` | `/leaderboard?username={username}` | Ranked sample learners plus the current learner. |

Example bootstrap request:

```http
POST /profile/bootstrap
Content-Type: application/json
```

```json
{
  "browser_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

Example answer request:

```http
POST /lessons/1/answer
Content-Type: application/json
```

```json
{
  "username": "browser-550e8400e29b41d4a716446655440000",
  "exercise_id": 1,
  "answer": "Hola"
}
```

## Project history and final implementation decisions

This is a summary of the requirements and changes discussed during the project, not a verbatim transcript.

1. **Build a Duolingo-inspired learning app.** The project was shaped around a Spanish learning course, a winding skill path, lesson exercises, learner progress, and familiar gamification UI.
2. **Expand learning content and question variety.** The course was expanded to seven units with ten nodes per unit. Lesson exercises use multiple formats—multiple choice, typed translation, word-bank, matching, and fill-in-the-blank—so lessons do not repeat the same question style every time.
3. **Stabilize path visuals and sizing.** Random mascot placement was replaced with explicit CSS positions. Node/mascot sizing and lesson-page scale were adjusted against the provided references; node cards keep their focus on the node itself rather than extra descriptive content.
4. **Review responsiveness.** Mobile, tablet, and desktop layouts were revisited in the live browser, including the path and lesson screens, and layout issues found during that review were addressed.
5. **Keep learner state consistent and browser-specific.** XP shown on different pages was aligned to the same backend learner record. A browser UUID stored in localStorage lets that browser resume progress while a different browser gets a fresh anonymous learner.
6. **Prepare documentation and hosting.** The database schema, setup steps, API, assumptions, and deployment configuration were documented. The schema relationship diagram is plain text so GitHub renders it reliably.
7. **Fix the production frontend build.** Vercel's build failed while processing `next/font/google` with a `next/font/google queries have exactly one entry` error. The Nunito build-time import was removed because the stylesheet already supplies a system font stack. `npm run build` then completed successfully, and commit `ca8c96a` (`Fix Vercel build font import`) was pushed to `main`.
8. **Deploy and verify the demo.** The FastAPI health endpoint was confirmed healthy on Render. The Vercel production deployment for `ca8c96a` reached Ready, and the project owner confirmed that the stable demo URL opens and works. Preview deployment URLs are separate and may be blocked by the API's production CORS allowlist.

## Assumptions and demo limitations

- The app starts as an anonymous demo learner; sign-in, registration, and account switching are not implemented.
- Spanish-from-English is the seeded course. Course content and leaderboard competitors are sample data.
- XP, streaks, hearts, daily goals, quests, and achievements use real app logic for the demo; leaderboard competitors are seeded examples rather than live external users.
- Gems, chest claims, and theme preference are stored in the browser. Purchases/subscriptions and social features are placeholders.
- Speech recognition/pronunciation scoring and additional languages are not implemented.
- Learner records live in the backend database, but the current Render free-tier SQLite filesystem is ephemeral; progress can reset when the instance restarts or is redeployed.
- The app assumes a default logged-in learner and does not provide authentication or production account security.

## Repository layout

```text
backend/
  app/
    api/routes/       # FastAPI path, lesson, profile, leaderboard endpoints
    db/               # SQLAlchemy session, course and leaderboard seed data
    models/           # SQLAlchemy schema models
    main.py           # FastAPI app and CORS configuration
  migrations/         # Alembic environment and schema revisions
  requirements.txt
frontend/
  app/
    components/       # Shared navigation and section pages
    practice/         # Practice route
    leaderboards/     # Leaderboard route
    quests/           # Quests route
    shop/             # Shop route
    profile/          # Profile route
    more/             # More/settings route
    page.tsx          # Learn path and lesson player
    browserLearner.ts # Browser UUID and learner bootstrap
    globals.css       # Responsive design, path styling, and animations
```
