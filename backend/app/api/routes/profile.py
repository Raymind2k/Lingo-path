from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.models import DailyActivity, User


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
    """Return a learner's saved stats and today's goal progress."""
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

    activity = db.scalar(
        select(DailyActivity).where(
            DailyActivity.user_id == user.id,
            DailyActivity.activity_date == today,
        )
    )

    today_xp = activity.xp_earned if activity else 0

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
        "daily_goal_met": today_xp >= user.stats.daily_xp_goal,
    }