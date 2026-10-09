import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.leaderboard import router as leaderboard_router
from app.api.routes.lessons import router as lessons_router
from app.api.routes.path import router as path_router
from app.api.routes.profile import router as profile_router


app = FastAPI(title="Lingo Path API")

default_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
] or default_cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(path_router)
app.include_router(lessons_router)
app.include_router(profile_router)
app.include_router(leaderboard_router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
