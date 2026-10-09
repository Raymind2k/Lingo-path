from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.models import (
    DailyActivity,
    Exercise,
    ExerciseAttempt,
    Lesson,
    Skill,
    Unit,
    User,
    UserSkillProgress,
    UserStats,
)


router = APIRouter(prefix="/lessons", tags=["lessons"])


class AnswerSubmission(BaseModel):
    username: str = "demo-learner"
    exercise_id: int
    answer: str = Field(min_length=1, max_length=500)


def get_db():
    """Provide a database session for one API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def refresh_hearts(stats: UserStats, now: datetime) -> None:
    """Regenerate one heart per 30-minute interval that has elapsed."""
    interval = timedelta(minutes=30)
    if stats.hearts >= stats.max_hearts:
        stats.next_heart_at = None
        return
    next_at = stats.next_heart_at
    if next_at is None:
        stats.next_heart_at = now + interval
        return
    if next_at.tzinfo is None:
        next_at = next_at.replace(tzinfo=timezone.utc)
    if now < next_at:
        return
    recovered = 1 + int((now - next_at) // interval)
    stats.hearts = min(stats.max_hearts, stats.hearts + recovered)
    stats.next_heart_at = (
        None
        if stats.hearts >= stats.max_hearts
        else next_at + interval * recovered
    )


def normalize_answer(value: str) -> str:
    """Ignore letter case and surrounding whitespace when comparing answers."""
    return value.strip().casefold()


@router.get("/{lesson_id}")
def get_lesson(
    lesson_id: int,
    username: str = "demo-learner",
    db: Session = Depends(get_db),
):
    """Return lesson content without exposing answer keys."""
    user = db.scalar(select(User).where(User.username == username))

    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")

    lesson = db.scalar(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(selectinload(Lesson.exercises))
    )

    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.scalar(
        select(UserSkillProgress).where(
            UserSkillProgress.user_id == user.id,
            UserSkillProgress.skill_id == lesson.skill_id,
        )
    )

    if progress is None or progress.status == "locked":
        raise HTTPException(status_code=403, detail="This lesson is locked")

    return {
        "id": lesson.id,
        "title": lesson.title,
        "xp_reward": lesson.xp_reward,
        "exercises": [
            {
                "id": exercise.id,
                "position": exercise.position,
                "exercise_type": exercise.exercise_type,
                "prompt": exercise.prompt,
                "config": {
                    key: value
                    for key, value in (exercise.config or {}).items()
                    if key not in {"correct_answer", "accepted_answers"}
                },
            }
            for exercise in sorted(lesson.exercises, key=lambda item: item.position)
        ],
    }


@router.post("/{lesson_id}/answer")
def submit_answer(
    lesson_id: int,
    submission: AnswerSubmission,
    db: Session = Depends(get_db),
):
    """Check and record an answer, then update rewards and skill progress."""
    answer = submission.answer.strip()
    if not answer:
        raise HTTPException(status_code=422, detail="Answer cannot be blank")

    user = db.scalar(
        select(User)
        .where(User.username == submission.username)
        .options(selectinload(User.stats))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")

    lesson = db.scalar(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(
            selectinload(Lesson.skill).selectinload(Skill.unit),
        )
    )
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    exercise = db.scalar(
        select(Exercise).where(
            Exercise.id == submission.exercise_id,
            Exercise.lesson_id == lesson_id,
        )
    )
    if exercise is None:
        raise HTTPException(
            status_code=404,
            detail="Exercise not found in this lesson",
        )

    progress = db.scalar(
        select(UserSkillProgress).where(
            UserSkillProgress.user_id == user.id,
            UserSkillProgress.skill_id == lesson.skill_id,
        )
    )
    if progress is None or progress.status == "locked":
        raise HTTPException(status_code=403, detail="This lesson is locked")

    if user.stats is None:
        raise HTTPException(
            status_code=409,
            detail="Learner statistics are missing; run the seed script again",
        )

    refresh_hearts(user.stats, datetime.now(timezone.utc))
    if user.stats.hearts <= 0:
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="No hearts remaining. Wait for a heart to refill before continuing.",
        )

    config = exercise.config or {}
    expected = config.get("correct_answer")
    accepted = config.get("accepted_answers", [])

    expected_answers = expected if isinstance(expected, list) else [expected]
    if isinstance(accepted, list):
        expected_answers.extend(accepted)

    correct_answers = [
        str(value)
        for value in expected_answers
        if value is not None
    ]
    if not correct_answers:
        raise HTTPException(
            status_code=500,
            detail="This exercise has no configured correct answer",
        )

    is_correct = any(
        normalize_answer(answer) == normalize_answer(correct)
        for correct in correct_answers
    )

    attempt = ExerciseAttempt(
        user_id=user.id,
        exercise_id=exercise.id,
        submitted_answer=answer,
        is_correct=is_correct,
        xp_awarded=0,
    )
    db.add(attempt)

    if not is_correct:
        user.stats.hearts = max(0, user.stats.hearts - 1)
        if user.stats.hearts < user.stats.max_hearts and user.stats.next_heart_at is None:
            user.stats.next_heart_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        db.commit()

        return {
            "correct": False,
            "feedback": "Not quite. Try again.",
            "correct_answer": correct_answers[0],
            "explanation": exercise.explanation,
            "hearts_remaining": user.stats.hearts,
            "xp_awarded": 0,
            "lesson_completed": False,
            "unlocked_skill": None,
        }

    # Get correct answers from earlier attempts before adding this one to the query results.
    lesson_exercise_ids = set(
        db.scalars(
            select(Exercise.id).where(Exercise.lesson_id == lesson.id)
        ).all()
    )
    previous_lesson_correct_ids = set(
        db.scalars(
            select(ExerciseAttempt.exercise_id).where(
                ExerciseAttempt.user_id == user.id,
                ExerciseAttempt.exercise_id.in_(lesson_exercise_ids),
                ExerciseAttempt.is_correct.is_(True),
            )
        ).all()
    )
    lesson_was_completed = lesson_exercise_ids.issubset(
        previous_lesson_correct_ids
    )

    # Flush saves this attempt and gives it an ID before we update its XP value.
    db.flush()

    correct_lesson_ids = previous_lesson_correct_ids | {exercise.id}
    lesson_is_completed = lesson_exercise_ids.issubset(correct_lesson_ids)

    xp_awarded = 0
    unlocked_skill = None

    if lesson_is_completed and not lesson_was_completed:
        xp_awarded = lesson.xp_reward
        attempt.xp_awarded = xp_awarded
        user.stats.total_xp += xp_awarded

        try:
            activity_date = datetime.now(ZoneInfo(user.timezone)).date()
        except (ZoneInfoNotFoundError, ValueError):
            activity_date = datetime.now(timezone.utc).date()

        activity = db.scalar(
            select(DailyActivity).where(
                DailyActivity.user_id == user.id,
                DailyActivity.activity_date == activity_date,
            )
        )
        already_active_today = activity is not None

        if activity is None:
            activity = DailyActivity(
                user_id=user.id,
                activity_date=activity_date,
                xp_earned=0,
                lessons_completed=0,
            )
            db.add(activity)

        activity.xp_earned += xp_awarded
        activity.lessons_completed += 1

        if not already_active_today:
            yesterday = activity_date - timedelta(days=1)
            had_activity_yesterday = db.scalar(
                select(DailyActivity.id).where(
                    DailyActivity.user_id == user.id,
                    DailyActivity.activity_date == yesterday,
                )
            )

            if had_activity_yesterday:
                user.stats.current_streak += 1
            else:
                user.stats.current_streak = 1

            user.stats.longest_streak = max(
                user.stats.longest_streak,
                user.stats.current_streak,
            )

        skill_exercise_ids = set(
            db.scalars(
                select(Exercise.id)
                .join(Lesson, Exercise.lesson_id == Lesson.id)
                .where(Lesson.skill_id == lesson.skill_id)
            ).all()
        )
        skill_correct_ids = set(
            db.scalars(
                select(ExerciseAttempt.exercise_id).where(
                    ExerciseAttempt.user_id == user.id,
                    ExerciseAttempt.exercise_id.in_(skill_exercise_ids),
                    ExerciseAttempt.is_correct.is_(True),
                )
            ).all()
        )

        if skill_exercise_ids.issubset(skill_correct_ids):
            if progress.status != "completed":
                progress.status = "completed"
                progress.crowns = min(5, progress.crowns + 1)

                ordered_skill_ids = db.scalars(
                    select(Skill.id)
                    .join(Unit, Skill.unit_id == Unit.id)
                    .where(Unit.course_id == lesson.skill.unit.course_id)
                    .order_by(Unit.position, Skill.position)
                ).all()

                if lesson.skill_id in ordered_skill_ids:
                    current_index = ordered_skill_ids.index(lesson.skill_id)

                    if current_index + 1 < len(ordered_skill_ids):
                        next_skill_id = ordered_skill_ids[current_index + 1]
                        next_progress = db.scalar(
                            select(UserSkillProgress).where(
                                UserSkillProgress.user_id == user.id,
                                UserSkillProgress.skill_id == next_skill_id,
                            )
                        )

                        if next_progress is None:
                            db.add(
                                UserSkillProgress(
                                    user_id=user.id,
                                    skill_id=next_skill_id,
                                    status="available",
                                    crowns=0,
                                )
                            )
                            unlocked_skill = next_skill_id
                        elif next_progress.status == "locked":
                            next_progress.status = "available"
                            unlocked_skill = next_skill_id

    db.commit()

    return {
        "correct": True,
        "feedback": "Correct!",
        "correct_answer": correct_answers[0],
        "explanation": exercise.explanation,
        "hearts_remaining": user.stats.hearts,
        "xp_awarded": xp_awarded,
        "lesson_completed": lesson_is_completed,
        "unlocked_skill": unlocked_skill,
    }
