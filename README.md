# Lingo Path

A full-stack, gamified language-learning app inspired by Duolingo. This project is being built for a full-stack engineering assignment.

## Project status

### Implemented

- Next.js frontend scaffold
- FastAPI backend with a `GET /health` endpoint
- Frontend request to the backend health endpoint
- SQLAlchemy database connection and model foundation

### In progress

- SQLite schema, migrations, and seeded course content
- Learning path and lesson player
- Learner progress and gamification

## Tech stack

- **Frontend:** Next.js, TypeScript
- **Backend:** Python, FastAPI
- **Database:** SQLite
- **ORM:** SQLAlchemy
- **Database migrations:** Alembic

## Architecture

The browser UI is built with Next.js. It calls the FastAPI backend, which will handle course content, lesson answers, and learner progress. The backend uses SQLAlchemy to access SQLite.

```text
Browser
  └── Next.js frontend
        └── FastAPI backend
              └── SQLAlchemy
                    └── SQLite

Project structure
backend/
  app/
    api/routes/   # API endpoints
    core/         # Shared configuration
    db/           # Database base and connection
    models/       # Database table models
    schemas/      # API request and response schemas
    services/     # Lesson and progress rules
    main.py       # FastAPI application
  requirements.txt

frontend/
  app/            # Next.js pages and layout
Local setup
Run the backend and frontend in separate terminals.
Backend
From the repository root in PowerShell:
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
fastapi dev app/main.py
The API runs at http://127.0.0.1:8000. Interactive API documentation is available at http://127.0.0.1:8000/docs.
Frontend
In a second terminal:
cd frontend
npm install
Create frontend/.env.local with:
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
Then start the frontend:
npm run dev
The frontend runs at http://localhost:3000.
API overview
Method	Endpoint	Purpose
GET	/health	Confirms that the backend is running


Planned features
- Course path with units, skills, and lesson progression
- Multiple choice, translation, word-bank, matching, fill-in-the-blank, and typed-answer exercises
- XP, streaks, hearts, daily goals, and learner progress
- Profile, achievements, and leaderboard
- Responsive layout, dark mode, audio, and timed challenge mode
