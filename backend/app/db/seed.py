from sqlalchemy import select

from app.db.session import SessionLocal
from app.db.course_expansion import expand_course
from app.models import (
    Course,
    Exercise,
    Lesson,
    Skill,
    Unit,
    User,
    UserSkillProgress,
    UserStats,
)


def seed_database() -> None:
    with SessionLocal() as db:
        with db.begin():
            course = db.scalar(
                select(Course).where(Course.slug == "spanish-foundations")
            )

            if course is None:
                course = Course(
                    slug="spanish-foundations",
                    name="Spanish Foundations",
                    source_language="English",
                    target_language="Spanish",
                    units=[
                        Unit(
                            position=1,
                            title="First Steps",
                            description="Learn greetings and introductions.",
                            skills=[
                                Skill(
                                    position=1,
                                    title="Greetings",
                                    lessons=[
                                        Lesson(
                                            position=1,
                                            title="Say hello",
                                            xp_reward=20,
                                            exercises=[
                                                Exercise(
                                                    position=1,
                                                    exercise_type="multiple_choice",
                                                    prompt="How do you say 'Hello' in Spanish?",
                                                    config={
                                                        "choices": ["Hola", "Adiós", "Gracias"],
                                                        "correct_answer": "Hola",
                                                    },
                                                    explanation="'Hola' means 'Hello'.",
                                                ),
                                                Exercise(
                                                    position=2,
                                                    exercise_type="translate",
                                                    prompt="Translate: Good morning",
                                                    config={
                                                        "correct_answer": "Buenos días",
                                                    },
                                                    explanation="'Buenos días' means 'Good morning'.",
                                                ),
                                                Exercise(
                                                    position=3,
                                                    exercise_type="word_bank",
                                                    prompt="Build the Spanish phrase for 'Hello, friend'.",
                                                    config={"words": ["Hola", "amigo", "gracias"], "correct_answer": "Hola amigo"},
                                                    explanation="'Hola amigo' means 'Hello, friend'.",
                                                ),
                                                Exercise(
                                                    position=4,
                                                    exercise_type="fill_blank",
                                                    prompt="Complete the Spanish greeting: Buenos ___.",
                                                    config={"correct_answer": "días"},
                                                    explanation="'Buenos días' means 'Good morning'.",
                                                ),
                                                Exercise(
                                                    position=5,
                                                    exercise_type="matching",
                                                    prompt="Match each Spanish word with its English meaning.",
                                                    config={
                                                        "pairs": [
                                                            {"left": "Hola", "right": "Hello"},
                                                            {"left": "Gracias", "right": "Thank you"},
                                                            {"left": "Adiós", "right": "Goodbye"},
                                                        ],
                                                        "right_options": ["Goodbye", "Hello", "Thank you"],
                                                        "correct_answer": "Hola=Hello|Gracias=Thank you|Adiós=Goodbye",
                                                    },
                                                    explanation="These are common Spanish greetings and polite phrases.",
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                                Skill(
                                    position=2,
                                    title="Introductions",
                                    lessons=[
                                        Lesson(
                                            position=1,
                                            title="Introduce yourself",
                                            xp_reward=20,
                                            exercises=[
                                                Exercise(
                                                    position=1,
                                                    exercise_type="multiple_choice",
                                                    prompt="Choose the Spanish phrase for 'My name is Ana'.",
                                                    config={
                                                        "choices": [
                                                            "Me llamo Ana",
                                                            "Hasta luego",
                                                            "Por favor",
                                                        ],
                                                        "correct_answer": "Me llamo Ana",
                                                    },
                                                    explanation="'Me llamo Ana' means 'My name is Ana'.",
                                                ),
                                                Exercise(
                                                    position=2,
                                                    exercise_type="translate",
                                                    prompt="Translate: I am a student",
                                                    config={
                                                        "correct_answer": "Soy estudiante",
                                                    },
                                                    explanation="'Soy estudiante' means 'I am a student'.",
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                            ],
                        ),
                        Unit(
                            position=2,
                            title="Everyday Words",
                            description="Practice polite phrases and useful vocabulary.",
                            skills=[
                                Skill(
                                    position=1,
                                    title="Polite Phrases",
                                    lessons=[
                                        Lesson(
                                            position=1,
                                            title="Please and thank you",
                                            xp_reward=20,
                                            exercises=[
                                                Exercise(
                                                    position=1,
                                                    exercise_type="multiple_choice",
                                                    prompt="How do you say 'Thank you' in Spanish?",
                                                    config={
                                                        "choices": [
                                                            "Gracias",
                                                            "Perdón",
                                                            "De nada",
                                                        ],
                                                        "correct_answer": "Gracias",
                                                    },
                                                    explanation="'Gracias' means 'Thank you'.",
                                                ),
                                                Exercise(
                                                    position=2,
                                                    exercise_type="translate",
                                                    prompt="Translate: Please",
                                                    config={
                                                        "correct_answer": "Por favor",
                                                    },
                                                    explanation="'Por favor' means 'Please'.",
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                                Skill(
                                    position=2,
                                    title="People",
                                    lessons=[
                                        Lesson(
                                            position=1,
                                            title="Talk about people",
                                            xp_reward=20,
                                            exercises=[
                                                Exercise(
                                                    position=1,
                                                    exercise_type="multiple_choice",
                                                    prompt="What does 'amigo' mean?",
                                                    config={
                                                        "choices": [
                                                            "Friend",
                                                            "Teacher",
                                                            "Book",
                                                        ],
                                                        "correct_answer": "Friend",
                                                    },
                                                    explanation="'Amigo' means 'male friend'.",
                                                ),
                                                Exercise(
                                                    position=2,
                                                    exercise_type="translate",
                                                    prompt="Translate: family",
                                                    config={
                                                        "correct_answer": "familia",
                                                    },
                                                    explanation="'Familia' means 'family'.",
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                            ],
                        ),
                    ],
                )
                db.add(course)
                db.flush()

            expand_course(db, course)

            user = db.scalar(select(User).where(User.username == "demo-learner"))

            if user is None:
                user = User(
                    username="demo-learner",
                    display_name="Demo Learner",
                    timezone="UTC",
                )
                db.add(user)
                db.flush()

            if user.stats is None:
                user.stats = UserStats()

            skills = db.scalars(
                select(Skill)
                .join(Unit)
                .where(Unit.course_id == course.id)
                .order_by(Unit.position, Skill.position)
            ).all()

            existing_progress = set(
                db.scalars(
                    select(UserSkillProgress.skill_id).where(
                        UserSkillProgress.user_id == user.id
                    )
                ).all()
            )

            for index, skill in enumerate(skills):
                if skill.id not in existing_progress:
                    db.add(
                        UserSkillProgress(
                            user_id=user.id,
                            skill_id=skill.id,
                            status="available" if index == 0 else "locked",
                            crowns=0,
                        )
                    )

    print("Database seed complete.")
    print("Course: Spanish Foundations")
    print("Demo learner: demo-learner")


if __name__ == "__main__":
    seed_database()