from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models import User, UserStats


SAMPLE_LEARNERS = [
    {
        "username": "leaderboard-ava",
        "display_name": "Ava",
        "total_xp": 180,
        "current_streak": 5,
        "longest_streak": 5,
    },
    {
        "username": "leaderboard-mateo",
        "display_name": "Mateo",
        "total_xp": 120,
        "current_streak": 3,
        "longest_streak": 4,
    },
    {
        "username": "leaderboard-sofia",
        "display_name": "Sofia",
        "total_xp": 85,
        "current_streak": 2,
        "longest_streak": 2,
    },
    {
        "username": "leaderboard-diego",
        "display_name": "Diego",
        "total_xp": 40,
        "current_streak": 1,
        "longest_streak": 1,
    },
]


def seed_leaderboard() -> None:
    with SessionLocal() as db:
        for learner_data in SAMPLE_LEARNERS:
            user = db.scalar(
                select(User)
                .where(User.username == learner_data["username"])
                .options(selectinload(User.stats))
            )

            if user is None:
                user = User(
                    username=learner_data["username"],
                    display_name=learner_data["display_name"],
                    timezone="UTC",
                )
                user.stats = UserStats()
                db.add(user)
            elif user.stats is None:
                user.stats = UserStats()

            user.display_name = learner_data["display_name"]
            user.stats.total_xp = learner_data["total_xp"]
            user.stats.current_streak = learner_data["current_streak"]
            user.stats.longest_streak = learner_data["longest_streak"]
            user.stats.hearts = 5
            user.stats.max_hearts = 5
            user.stats.daily_xp_goal = 180

        db.commit()

    print("Leaderboard sample learners are ready.")


if __name__ == "__main__":
    seed_leaderboard()
