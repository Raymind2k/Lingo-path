# Lingo Path - Chat Handoff

Last updated: 2026-10-09 (unit topic dividers and themes)

This file is a working handoff for continuing the Lingo Path project in another chat. Read it together with the root `README.md`, then inspect the current working tree before editing anything. The Git working tree has local changes that must be preserved.

## Project goal

Build a functional Duolingo-inspired language-learning web app for the SDE Fullstack assignment. The assignment asks for a close visual and functional match to the modern Duolingo experience: a learning path/skill tree, interactive lessons, XP and streaks, hearts, progress tracking, and playful gamification. Seeded Spanish-from-English content is enough; real speech recognition, payments, subscriptions, social networking, and multi-language accounts may remain mocked/placeholders.

The user cares strongly about the UI feeling like Duolingo rather than a generic quiz app. Reference images in the original chat showed:

- A dark learning page with a left navigation sidebar, a winding/zig-zag path, circular lesson nodes, unit headers, and reward chests.
- The Duolingo-style lesson screen: a top progress bar and heart counter; large question and illustrated choices; a bottom response tray after answering.
- Separate pages for Learn, Practice, Leaderboards, Quests, Shop, Profile, and More/settings.
- Unit-specific cartoon characters/animations, with mascots away from lesson nodes. Characters should vary in placement and size; some units may show two characters. The green bird should dance rather than simply roll.

## Current implementation

### Frontend

- Next.js 16 / React 19 / TypeScript application under `frontend/`.
- The main learning path and lesson player are in `frontend/app/page.tsx`.
- Shared navigation and section pages are under `frontend/app/components/` and route folders.
- Separate routes exist for Practice, Leaderboards, Quests, Shop, Profile, and More/settings.
- The UI has a dark-first theme and a saved light/dark preference.
- The learning path has five seeded units and 23 skills, status states for locked/available/completed nodes, crowns/progress, unit chests, and animated decorative mascots. Each unit position cycles through green, pink, teal, orange, and blue themes applied to its banner and available/completed skill nodes. Completed skill nodes and completed quest tasks use star markers; unit paths remain directly on the dark page surface without a lighter enclosing card. Each unit path displays its teaching topic between thin horizontal lines; its unit banner and node accents share a distinct color, including a pink second unit. Each unit also ends with a slim divider. Duo is a fixed-size character inside the independently-scaled mascot wrapper so its head and body stay aligned during the dance. Mascot sizes are seeded but intentionally contrasted, with a different scale for each member of two-mascot units. Duo dances; the thinker floats/sways, gardener bobs, fox steps, and dancer sways/dances. The current path layout and mascot locations are CSS-driven and responsive.
- Lesson types include multiple choice, typed answers, word bank/translation, matching, and fill-in-the-blank. The lesson screen has an answer progress bar, heart display, check button, lesson completion state, and out-of-hearts recovery dialog.
- Latest local UI work aligns answer feedback more closely with the reference: correct answers highlight the correct choice green, advance the displayed lesson progress, show "Awesome!", and provide Continue plus Too Easy / Too Difficult / Report options. Those reaction buttons are local to the current lesson session and do not submit API answers or change XP/hearts. Incorrect answers show the expected answer and explanation, the backend deducts a heart, and the frontend offers a retry. At zero hearts, a recovery/refill dialog appears.
- The app layout has responsive desktop sizing and a compact mobile treatment. The lesson canvas and illustrated choices use a wider desktop layout, while the response tray spans the viewport with the Duolingo-style feedback and Continue action. The narrower mobile treatment remains in place.

### Backend

- Python / FastAPI / SQLAlchemy / Alembic under `backend/`.
- `backend/app/main.py` registers the API routers and CORS configuration.
- SQLAlchemy models cover course content, users/stats, skill progress, daily activity, and exercise attempts.
- Endpoints currently include:
  - `GET /health`
  - `GET /path/{username}`
  - `GET /lessons/{lesson_id}?username={username}`
  - `POST /lessons/{lesson_id}/answer`
  - `GET /profile/{username}`
  - `POST /profile/{username}/refill-hearts`
  - `GET /leaderboard`
- Lesson answer submission persists attempts, deducts a heart for an incorrect response, awards XP on first completion, updates activity/streak data, and may unlock skill progress. Hearts regenerate with time and can be refilled via the demo endpoint.
- Profile data includes learner stats, daily goal/quest information, and achievements. The leaderboard uses seeded demo learners.
- Seed and data update scripts are in `backend/app/db/`: `seed.py`, `seed_leaderboard.py`, `course_expansion.py`, and the `add_*_exercise.py` scripts.

### Persistence and demo scope

- The default learner is `demo-learner`; real authentication and multiple real accounts are not implemented.
- The SQLite database is `backend/lingo_path.db`. It existed when this handoff was created and is ignored by Git. Keep it if the learner's existing XP, hearts, streak, and attempts should persist. Do not delete or recreate it casually.
- Gems/chest claim UI uses browser local storage. Leaderboard learners are sample seeded users. Shop/subscription features are mock UI.
- Seeded content is Spanish from English.

## Current Git state - important

- Branch: `main`
- `HEAD` and `origin/main`: `a091041` (`Expand learning path and update project docs`)
- Current working tree has **uncommitted local modifications** in:
  - `README.md`
  - `HANDOFF_README.md`
  - `frontend/app/components/SectionPage.tsx`
  - `frontend/app/page.tsx`
  - `frontend/app/globals.css`
- These changes are intentional. They include current lesson/player/path UI work and latest answer-response refinements. Do not reset, checkout over, or replace them with code copied from an older chat excerpt. Inspect `git diff` first and preserve the changes.
- For the latest UI edits, `git diff --check` and `npm run build` completed successfully. `npm run lint` still reports existing `react-hooks/set-state-in-effect` and Next.js anchor-navigation violations in `page.tsx` and `SectionPage.tsx`; the production build succeeds. Live browser screenshot inspection was blocked by the browser access policy, so route layout was audited in source and all routes were confirmed in the production build. Avoid submitting lesson answers during visual inspection because that changes the demo learner progress.
- No commit or push was requested for the latest local edits. Do not commit or push unless the user asks.

### Recent commits already on `main` (oldest to newest)

- `8a800b8` Initialize Lingo Path project
- `33f0a86` Add project README
- `a96e3fc` Add word bank exercise support
- `607befb` Update lesson exercises and daily goal display
- `e037e9c` Add achievements and learner leaderboard
- `48117d4` Add dark mode toggle
- `5364526` Add separate navigation pages
- `ab962fe` Complete lesson progress and recovery flows
- `ee7f07e` Polish Duolingo-style learning path dashboard
- `a091041` Expand learning path and update project docs

## Start the app on Windows

Keep two PowerShell windows open, one for the backend and one for the frontend.

### Backend

```powershell
Set-Location "C:\Users\yesam\Desktop\ScalerAi\Lingo-path\backend"
.\.venv\Scripts\Activate.ps1
fastapi dev app/main.py
```

If PowerShell blocks activation, run this in the backend window and then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

The API is at `http://127.0.0.1:8000`; Swagger is at `http://127.0.0.1:8000/docs`.

### Frontend

Open a second PowerShell window:

```powershell
Set-Location "C:\Users\yesam\Desktop\ScalerAi\Lingo-path\frontend"
npm run dev
```

Then open `http://localhost:3000`. The frontend defaults to `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`; if needed, set that in `frontend/.env.local`. If dependencies are missing, run `npm install` inside `frontend`. The backend virtual environment already exists at `backend/.venv` in the current checkout.

The backend and frontend stop when their terminal windows close or the computer shuts down; restart both this way after a restart. The local SQLite database should remain on disk.

## How to continue in a new chat

Paste or attach this file and say that the chat should continue the Lingo Path project in the existing checkout. Ask the assistant to:

1. Read `README.md` and this handoff, then inspect `git status --short --branch` and the existing diffs before editing.
2. Preserve all uncommitted changes and the SQLite database.
3. Continue the Duolingo-style UI/UX goal, especially the response tray, responsive path sizing, branching path, unit rewards, and varied dancing/animated mascots.
4. Keep the root `README.md` updated for major feature or behavior changes, and update this handoff when the project state materially changes.
5. Verify changes carefully without changing demo learner data; ask before committing/pushing unless the user has requested that action.

## Chat/project history notes

- The user previously reported accidentally changing `profile.py`; the profile endpoint was reviewed/restored and the app later loaded successfully.
- The user repeatedly confirmed API, leaderboard, and frontend sections were working during earlier work.
- The user explicitly said the assignment requires a close match to the original Duolingo UI/UX and supplied screenshots/video references. Treat those as design references, not as separate project instructions.
- The user asked for the README to be maintained with each major implementation/modification. That is why this handoff is separate from the normal product README.