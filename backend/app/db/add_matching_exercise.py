from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import Course, Exercise, Lesson, Skill, Unit


def add_matching_exercise() -> None:
    with SessionLocal() as db:
        with db.begin():
            lesson = db.scalar(
                select(Lesson)
                .join(Skill, Lesson.skill_id == Skill.id)
                .join(Unit, Skill.unit_id == Unit.id)
                .join(Course, Unit.course_id == Course.id)
                .where(
                    Course.slug == "spanish-foundations",
                    Lesson.title == "Say hello",
                )
            )

            if lesson is None:
                raise RuntimeError(
                    "Could not find the 'Say hello' lesson. "
                    "Check that the seed script has been run."
                )

            existing_exercise = db.scalar(
                select(Exercise).where(
                    Exercise.lesson_id == lesson.id,
                    Exercise.exercise_type == "matching",
                )
            )

            if existing_exercise is not None:
                print("A matching exercise is already in the Say hello lesson.")
                return

            last_position = db.scalar(
                select(func.max(Exercise.position)).where(
                    Exercise.lesson_id == lesson.id
                )
            )

            db.add(
                Exercise(
                    lesson_id=lesson.id,
                    position=(last_position or 0) + 1,
                    exercise_type="matching",
                    prompt="Match each Spanish word with its English meaning.",
                    config={
                        "pairs": [
                            {"left": "Hola", "right": "Hello"},
                            {"left": "Gracias", "right": "Thank you"},
                            {"left": "Adiós", "right": "Goodbye"},
                        ],
                        "right_options": [
                            "Goodbye",
                            "Hello",
                            "Thank you",
                        ],
                        "correct_answer": (
                            "Hola=Hello|Gracias=Thank you|Adiós=Goodbye"
                        ),
                    },
                    explanation="These are common Spanish greetings and polite phrases.",
                )
            )

    print("Added a matching exercise to the Say hello lesson.")


if __name__ == "__main__":
    add_matching_exercise()