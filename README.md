# Lingo Path

Lingo Path is a full-stack language-learning app inspired by Duolingo. It recreates the learning path, lesson loop, and progress mechanics in a playful, dark-first interface. The current course teaches Spanish from English using seeded demo content.

## Features

- **Learning path:** Five seeded units with 23 skills, lesson nodes, locked/available/completed states, crowns, mascot animations, and reward chests.
- **Interactive lessons:** Multiple choice, typed translation, word bank, matching, and fill-in-the-blank exercises, with answer feedback and lesson progress.
- **Progress and rewards:** XP, daily goals and quests, streaks, hearts with timed regeneration and refill, achievements, and saved learner progress.
- **Separate app sections:** Learn, Practice, Leaderboards, Quests, Shop, Profile, and More, using shared navigation.
- **Responsive interface:** Desktop sidebar and learning dashboard, compact phone navigation, dark theme support and a saved light/dark preference.
- **Demo leaderboard:** Seeded sample learners make the leaderboard usable without multiple real accounts.

## Project status and demo limitations

The default learner is `demo-learner`; real authentication and multiple learner accounts are not implemented. The database stores course content, learner statistics, attempts, and progress locally in SQLite. The appearance preference is stored in the browser. Shop subscriptions and power-ups are demonstrations/placeholders, and leaderboard entries are seeded sample data.

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Python, FastAPI
- **Database and ORM:** SQLite, SQLAlchemy
- **Schema migrations:** Alembic

## Repository layout

```text
backend/
  app/
    api/routes/     # Learning path, lessons, profile, and leaderboard endpoints
    db/             # Database connection and seed scripts
    models/         # Course, learner, exercise, and progress models
    main.py         # FastAPI app and CORS configuration
  migrations/       # Alembic schema migrations
  requirements.txt

frontend/
  app/
    components/     # Shared navigation and section pages
    practice/       # Practice route
    leaderboards/   # Leaderboard route
    quests/         # Quests route
    shop/           # Shop route
    profile/        # Profile route
    more/           # More/settings route
    page.tsx         # Learn path and lesson player
    globals.css      # App styling and responsive layouts
```

## Run locally on Windows

Run the backend and frontend in separate PowerShell terminals.

### 1. Set up the backend

From the repository root:

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
python -m app.db.seed_leaderboard
fastapi dev app/main.py
```

The API runs at <http://127.0.0.1:8000>. Swagger UI is at <http://127.0.0.1:8000/docs>. The seed commands create the Spanish course, the `demo-learner`, and sample leaderboard learners. The SQLite database is stored at `backend/lingo_path.db` and is ignored by Git.

If PowerShell blocks virtual-environment activation, allow it for the current terminal only, then activate:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 2. Set up the frontend

In a second PowerShell terminal, from the repository root:

```powershell
Set-Location .\frontend
npm install
```

Create `frontend/.env.local` with the backend URL (the app defaults to this URL if the file is omitted):

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then start Next.js:

```powershell
npm run dev
```

Open <http://localhost:3000>.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check that the API is running. |
| `GET` | `/path/{username}` | Load the learner's course path and skill progress. |
| `GET` | `/lessons/{lesson_id}?username={username}` | Load a lesson and its exercises. |
| `POST` | `/lessons/{lesson_id}/answer` | Submit an answer and update lesson progress. |
| `GET` | `/profile/{username}` | Load learner stats, goals, quests, and achievements. |
| `POST` | `/profile/{username}/refill-hearts` | Refill the learner's hearts. |
| `GET` | `/leaderboard` | Load the seeded weekly leaderboard. |

## Documentation upkeep

Update this README when a major change affects app features, navigation, API endpoints, database setup, or local run instructions. Keep implemented features separate from demo placeholders so the project status stays accurate.
