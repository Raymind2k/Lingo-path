# Lingo Path

Lingo Path is a full-stack language-learning app inspired by Duolingo. It recreates the learning path, lesson loop, and progress mechanics in a playful, dark-first interface. The current course teaches Spanish from English using seeded demo content.

## Features

- **Learning path:** Five seeded units with 23 skills, lesson nodes, locked/available/completed states, star markers on completed skills, crowns, reward chests, and rotating green, pink, teal, orange, and blue unit themes, with the topic divider appearing before each colored unit banner. The banner stays pinned at the top while scrolling through its unit, then yields to the next unit banner. Unit paths sit directly on the dark page surface, with subtle dividers between units.
- **Interactive lessons:** A focused lesson player with multiple choice, typed translation, word bank, matching, and fill-in-the-blank exercises. Correct answers highlight green, advance progress, and show Duolingo-style feedback with session-only difficulty/report controls; incorrect answers show the correct solution and explanation, deduct a heart, and allow a retry.
- **Progress and rewards:** XP, daily goals and quests, streaks, hearts with timed regeneration and refill, achievements, and saved learner progress.
- **Separate app sections:** Learn, Practice, Leaderboards, Quests, Shop, Profile, and More, using shared navigation.
- **Typography:** Nunito is loaded as the site-wide rounded typeface, with larger body and path text plus heavier heading weights, following the Duolingo recommended substitute when the proprietary Feather/DIN fonts are unavailable.
- **Responsive interface:** Viewport-scaled desktop sidebar, learning path, and right rail; a wide lesson canvas with large illustrated answer choices and a full-width Duolingo-style response tray; compact phone navigation; larger seeded mascot characters placed closer to the path with deliberately contrasting sizes and character-specific dance, sway, bounce, and explorer animations; the dancing bird keeps its head and body aligned; dark theme support with a saved light/dark preference.
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

## Recent learning-page layout refinement

The desktop Learn page now uses a compact header band with learner stats aligned across the top, bringing the first unit closer to the visible learning area. The path rows and lesson nodes follow a tighter, more Duolingo-like vertical rhythm, with slightly larger nodes and clearer skill labels. Daily goal, leaderboard, and quest cards use readable desktop text sizing and spacing while retaining the existing responsive layout and mobile rules.

## Learning path scale follow-up

The full-page desktop path now uses larger circular lesson nodes, completion/status icons, and row spacing. Character placement remains seeded but sits closer to the node path. Duo’s fixed-size illustration is scaled as a complete character per size tier, keeping its head and body aligned during the dance. The changes target the difference between the full Learn page and the focused unit view while preserving the responsive layout.

## Scroll-aware unit title

The Learn path shows the unit topic on a thin divider before the colored unit banner. One shared banner stays pinned while the learner scrolls through the path. When the next unit’s topic divider reaches the bottom edge of that banner, its title, unit number, and theme color switch together; scrolling upward switches back to the previous unit. This keeps the title visible above the learning path without stacking multiple sticky banners.

## Mascot and lesson-node polish

Animated unit characters now use the nearest lesson row to choose an outer gutter, keeping them clear of the alternating skill-label columns while they move. Two-character units use separated randomized vertical bands to keep their idle animations from colliding. All three character size tiers are larger, with responsive sizes for narrow screens. Lesson nodes use a brighter top bevel and a darker, accent-matched lower rim and shadow to give the circles more raised depth.

## Lesson answer results

Every exercise type uses the same fixed bottom answer-result bar for correct and incorrect responses. The answer choices and success panel are sized to match the supplied reference more closely. On the final question, the correct-answer result remains visible until the learner selects Continue; only then does the lesson-complete screen open.

## Consistent lesson question sizing

Typed-answer, matching, word-bank, and multiple-choice exercises share the same responsive lesson content width. Typed-answer fields now fill the exercise area instead of staying in a narrower capped column, and supporting instructions, labels, word chips, and matching controls use larger desktop sizing. Mobile layouts retain compact responsive controls.

Lesson typography now scales up across the full exercise flow: topic and exercise labels, prompts, answer labels and values, choice text, progress and hearts, audio controls, and the footer action. Mobile keeps its own readable type scale.

The fixed lesson footer has also been enlarged, including its guidance text, Check button, and vertical spacing, so the action remains legible and easy to reach.

Spanish answer validation ignores missing vowel accents and surrounding punctuation while preserving meaningful letters such as `ñ`. If the submitted wording is correct but its accent marks differ, the answer is accepted and the correct accented form is shown in the success feedback.

Lesson XP is awarded once when a learner completes a lesson; the result displays the award, and the learner's total is refreshed from the API without using a cached profile response. The daily XP goal is 180 XP. Existing databases need `alembic upgrade head` from the `backend` directory to update their saved goal.
