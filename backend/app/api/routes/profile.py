from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone, tzinfo
from math import ceil
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.models import (
    Course,
    DailyActivity,
    ExerciseAttempt,
    Skill,
    Unit,
    User,
    UserSkillProgress,
    UserStats,
)


router = APIRouter(prefix="/profile", tags=["profile"])
HEART_REFILL_INTERVAL = timedelta(minutes=30)


class BrowserLearnerBootstrap(BaseModel):
    browser_id: UUID


def get_db():
    """Provide a database session for one API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def user_timezone(user: User) -> tzinfo:
    try:
        return ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def advance_heart_regeneration(user_stats: UserStats, now: datetime) -> None:
    """Regenerate one heart every 30 minutes, including elapsed intervals."""
    if user_stats.hearts >= user_stats.max_hearts:
        user_stats.next_heart_at = None
        return

    next_heart_at = user_stats.next_heart_at
    if next_heart_at is None:
        user_stats.next_heart_at = now + HEART_REFILL_INTERVAL
        return
    if next_heart_at.tzinfo is None:
        next_heart_at = next_heart_at.replace(tzinfo=timezone.utc)

    if now < next_heart_at:
        return

    gained = 1 + int((now - next_heart_at) // HEART_REFILL_INTERVAL)
    user_stats.hearts = min(user_stats.max_hearts, user_stats.hearts + gained)
    if user_stats.hearts >= user_stats.max_hearts:
        user_stats.next_heart_at = None
    else:
        user_stats.next_heart_at = next_heart_at + HEART_REFILL_INTERVAL * gained


def utc_naive(local_date: date, zone: tzinfo) -> datetime:
    """Convert local midnight to naive UTC for SQLite DateTime comparisons."""
    return (
        datetime.combine(local_date, time.min, tzinfo=zone)
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )


def get_profile_data(username: str, db: Session):
    user = db.scalar(
        select(User)
        .where(User.username == username)
        .options(selectinload(User.stats))
    )

    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")
    if user.stats is None:
        raise HTTPException(status_code=409, detail="Learner statistics are missing")

    now = datetime.now(timezone.utc)
    advance_heart_regeneration(user.stats, now)
    zone = user_timezone(user)
    today = now.astimezone(zone).date()
    today_activity = db.scalar(
        select(DailyActivity).where(
            DailyActivity.user_id == user.id,
            DailyActivity.activity_date == today,
        )
    )
    today_xp = today_activity.xp_earned if today_activity else 0
    today_lessons = today_activity.lessons_completed if today_activity else 0

    today_start = utc_naive(today, zone)
    tomorrow_start = utc_naive(today + timedelta(days=1), zone)
    correct_exercises_today = db.scalar(
        select(func.count(ExerciseAttempt.id)).where(
            ExerciseAttempt.user_id == user.id,
            ExerciseAttempt.is_correct.is_(True),
            ExerciseAttempt.created_at >= today_start,
            ExerciseAttempt.created_at < tomorrow_start,
        )
    ) or 0

    month_start = today.replace(day=1)
    month_lessons = db.scalar(
        select(func.coalesce(func.sum(DailyActivity.lessons_completed), 0)).where(
            DailyActivity.user_id == user.id,
            DailyActivity.activity_date >= month_start,
            DailyActivity.activity_date <= today,
        )
    ) or 0

    completed_skills = db.scalar(
        select(func.count(UserSkillProgress.id)).where(
            UserSkillProgress.user_id == user.id,
            UserSkillProgress.status == "completed",
        )
    ) or 0
    lessons_completed_all_time = db.scalar(
        select(func.coalesce(func.sum(DailyActivity.lessons_completed), 0)).where(
            DailyActivity.user_id == user.id,
        )
    ) or 0

    daily_goal = user.stats.daily_xp_goal
    daily_quests = [
        {
            "id": "earn_xp",
            "title": "Earn 10 XP",
            "icon": "⚡",
            "progress": min(today_xp, 10),
            "target": 10,
        },
        {
            "id": "finish_lesson",
            "title": "Complete a lesson",
            "icon": "🦉",
            "progress": min(today_lessons, 1),
            "target": 1,
        },
        {
            "id": "correct_answers",
            "title": "Get 5 answers correct",
            "icon": "🎧",
            "progress": min(int(correct_exercises_today), 5),
            "target": 5,
        },
    ]
    for quest in daily_quests:
        quest["completed"] = quest["progress"] >= quest["target"]

    monthly_target = 20
    monthly_progress = min(int(month_lessons), monthly_target)
    monthly_quest = {
        "title": "Complete 20 lessons this month",
        "progress": monthly_progress,
        "target": monthly_target,
        "completed": monthly_progress >= monthly_target,
        "days_remaining": monthrange(today.year, today.month)[1] - today.day,
    }

    achievements = [
        {"id": "first_lesson", "title": "First Steps", "description": "Complete your first lesson.", "icon": "🌱", "unlocked": int(lessons_completed_all_time) >= 1},
        {"id": "first_skill", "title": "Path Maker", "description": "Complete your first skill.", "icon": "🗺️", "unlocked": int(completed_skills) >= 1},
        {"id": "xp_100", "title": "Century", "description": "Earn 100 total XP.", "icon": "⚡", "unlocked": user.stats.total_xp >= 100},
        {"id": "streak_3", "title": "Three-Day Streak", "description": "Reach a three-day learning streak.", "icon": "🔥", "unlocked": user.stats.longest_streak >= 3},
        {"id": "daily_goal", "title": "Daily Goal", "description": "Reach your daily XP goal today.", "icon": "🎯", "unlocked": today_xp >= daily_goal},
    ]

    if db.is_modified(user.stats):
        db.commit()

    refill_seconds = None
    if user.stats.next_heart_at:
        next_at = user.stats.next_heart_at
        if next_at.tzinfo is None:
            next_at = next_at.replace(tzinfo=timezone.utc)
        refill_seconds = max(0, ceil((next_at - now).total_seconds()))

    return {
        "username": user.username,
        "display_name": user.display_name,
        "total_xp": user.stats.total_xp,
        "current_streak": user.stats.current_streak,
        "longest_streak": user.stats.longest_streak,
        "hearts": user.stats.hearts,
        "max_hearts": user.stats.max_hearts,
        "next_heart_at": (
            user.stats.next_heart_at.isoformat()
            if user.stats.next_heart_at
            else None
        ),
        "heart_refill_seconds": refill_seconds,
        "daily_xp_goal": daily_goal,
        "today_xp": today_xp,
        "daily_goal_met": today_xp >= daily_goal,
        "daily_quests": daily_quests,
        "monthly_quest": monthly_quest,
        "achievements": achievements,
    }


@router.post("/bootstrap")
def bootstrap_browser_learner(
    request: BrowserLearnerBootstrap,
    db: Session = Depends(get_db),
):
    """Create or resolve the anonymous learner saved by one browser profile."""
    username = f"browser-{request.browser_id.hex}"
    user = db.scalar(select(User).where(User.username == username))
    if user is not None:
        return {"username": username}

    course = db.scalar(select(Course).where(Course.slug == "spanish-foundations"))
    if course is None:
        raise HTTPException(status_code=503, detail="Course content has not been seeded")

    skills = db.scalars(
        select(Skill)
        .join(Unit)
        .where(Unit.course_id == course.id)
        .order_by(Unit.position, Skill.position)
    ).all()
    if not skills:
        raise HTTPException(status_code=503, detail="Course skills have not been seeded")

    user = User(username=username, display_name="Demo Learner", timezone="UTC")
    user.stats = UserStats()
    db.add(user)
    try:
        db.flush()
        db.add_all(
            UserSkillProgress(
                user_id=user.id,
                skill_id=skill.id,
                status="available" if index == 0 else "locked",
                crowns=0,
            )
            for index, skill in enumerate(skills)
        )
        db.commit()
    except IntegrityError:
        # Two tabs in the same browser can initialize together. The unique
        # username makes creation idempotent; the losing request reuses the row.
        db.rollback()
        if db.scalar(select(User.id).where(User.username == username)) is None:
            raise

    return {"username": username}


@router.get("/{username}")
def get_profile(username: str, db: Session = Depends(get_db)):
    """Return a learner's saved stats, heart timer, quests, and achievements."""
    return get_profile_data(username, db)


@router.post("/{username}/refill-hearts")
def refill_hearts(username: str, db: Session = Depends(get_db)):
    """Mock a free refill from the in-app shop."""
    user = db.scalar(
        select(User)
        .where(User.username == username)
        .options(selectinload(User.stats))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")
    if user.stats is None:
        raise HTTPException(status_code=409, detail="Learner statistics are missing")

    user.stats.hearts = user.stats.max_hearts
    user.stats.next_heart_at = None
    db.commit()
    return {"hearts": user.stats.hearts, "max_hearts": user.stats.max_hearts, "message": "Hearts refilled."}
