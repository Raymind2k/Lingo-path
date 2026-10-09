from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.models import Course, Skill, Unit, User, UserSkillProgress


router = APIRouter(prefix="/path", tags=["learning path"])


def get_db():
    """Provide a database session for one API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{username}")
def get_learning_path(username: str, db: Session = Depends(get_db)):
    """Return a learner's course structure and skill progress."""
    user = db.scalar(
        select(User)
        .where(User.username == username)
        .options(selectinload(User.skill_progress))
    )

    if user is None:
        raise HTTPException(status_code=404, detail="Learner not found")

    course = db.scalar(
        select(Course)
        .where(Course.slug == "spanish-foundations")
        .options(
            selectinload(Course.units)
            .selectinload(Unit.skills)
            .selectinload(Skill.lessons)
        )
    )

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    progress_by_skill_id = {
        progress.skill_id: progress
        for progress in user.skill_progress
    }

    return {
        "learner": {
            "username": user.username,
            "display_name": user.display_name,
        },
        "course": {
            "slug": course.slug,
            "name": course.name,
            "source_language": course.source_language,
            "target_language": course.target_language,
            "units": [
                {
                    "id": unit.id,
                    "position": unit.position,
                    "title": unit.title,
                    "description": unit.description,
                    "skills": [
                        {
                            "id": skill.id,
                            "position": skill.position,
                            "title": skill.title,
                            "lessons": [
                                {
                                    "id": lesson.id,
                                    "position": lesson.position,
                                    "title": lesson.title,
                                    "xp_reward": lesson.xp_reward,
                                }
                                for lesson in skill.lessons
                            ],
                            "progress": (
                                {
                                    "status": progress_by_skill_id[skill.id].status,
                                    "crowns": progress_by_skill_id[skill.id].crowns,
                                }
                                if skill.id in progress_by_skill_id
                                else {
                                    "status": "locked",
                                    "crowns": 0,
                                }
                            ),
                        }
                        for skill in unit.skills
                    ],
                }
                for unit in course.units
            ],
        },
    }