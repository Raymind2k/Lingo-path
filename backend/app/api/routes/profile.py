from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.models import DailyActivity, User, UserSkillProgress


router = APIRouter(prefix="/profile", tags=["profile"])


def get_db():
    """Provide a database session for one API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{username}")
def get_profile(username: str, db: Session = Depends(get_db)):
    """Return a learner's stats, daily goal progress, and achievements."""
    user = db.scalar(
        select(User)
        .where(User.username == username)
        .options(selectinload(User.stats))
    )

    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")

    if user.stats is None:
        raise HTTPException(
            status_code=409,
            detail="Learner statistics are missing",
        )

    try:
        today = datetime.now(ZoneInfo(user.timezone)).date()
    except (ZoneInfoNotFoundError, ValueError):
        today = datetime.now(timezone.utc).date()

    today_activity = db.scalar(
        select(DailyActivity).where(
            DailyActivity.user_id == user.id,
            DailyActivity.activity_date == today,
        )
    )
    today_xp = today_activity.xp_earned if today_activity else 0

    lessons_completed = db.scalar(
        select(func.coalesce(func.sum(DailyActivity.lessons_completed), 0)).where(
            DailyActivity.user_id == user.id
        )
    )

    completed_skills = db.scalar(
        select(func.count(UserSkillProgress.id)).where(
            UserSkillProgress.user_id == user.id,
            UserSkillProgress.status == "completed",
        )
    )

    lessons_completed = int(lessons_completed or 0)
    completed_skills = int(completed_skills or 0)
    daily_goal_met = today_xp >= user.stats.daily_xp_goal

    achievements = [
        {
            "id": "first_lesson",
            "title": "First Steps",
            "description": "Complete your first lesson.",
            "icon": "🌱",
            "unlocked": lessons_completed >= 1,
        },
        {
            "id": "first_skill",
            "title": "Path Maker",
            "description": "Complete your first skill.",
            "icon": "🗺️",
            "unlocked": completed_skills >= 1,
        },
        {
            "id": "xp_100",
            "title": "Century",
            "description": "Earn 100 total XP.",
            "icon": "⚡",
            "unlocked": user.stats.total_xp >= 100,
        },
        {
            "id": "streak_3",
            "title": "Three-Day Streak",
            "description": "Reach a three-day learning streak.",
            "icon": "🔥",
            "unlocked": user.stats.longest_streak >= 3,
        },
        {
            "id": "daily_goal",
            "title": "Daily Goal",
            "description": "Reach your daily XP goal today.",
            "icon": "🎯",
            "unlocked": daily_goal_met,
        },
    ]

    return {
        "username": user.username,
        "display_name": user.display_name,
        "total_xp": user.stats.total_xp,
        "current_streak": user.stats.current_streak,
        "longest_streak": user.stats.longest_streak,
        "hearts": user.stats.hearts,
        "max_hearts": user.stats.max_hearts,
        "daily_xp_goal": user.stats.daily_xp_goal,
        "today_xp": today_xp,
        "daily_goal_met": daily_goal_met,
        "achievements": achievements,
    }