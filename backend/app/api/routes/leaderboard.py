from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import User, UserStats


router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def get_db():
    """Provide a database session for one API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_leaderboard(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Return learners ranked by total XP, with streaks as a tiebreaker."""
    rows = db.execute(
        select(User, UserStats)
        .join(UserStats, UserStats.user_id == User.id)
        .order_by(
            UserStats.total_xp.desc(),
            UserStats.current_streak.desc(),
            User.display_name.asc(),
        )
        .limit(limit)
    ).all()

    leaderboard = [
        {
            "rank": rank,
            "username": user.username,
            "display_name": user.display_name,
            "total_xp": stats.total_xp,
            "current_streak": stats.current_streak,
        }
        for rank, (user, stats) in enumerate(rows, start=1)
    ]

    return {"leaderboard": leaderboard}