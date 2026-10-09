from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Course, Exercise, Lesson, Skill, Unit


# Small, idempotent curriculum extension for learners whose database already
# contains the original two-unit seed. Existing course and learner progress are kept.
NEW_UNITS = [
    {
        "position": 3,
        "title": "Food and Drink",
        "description": "Learn the words you need at the table and café.",
        "skills": [
            {"title": "Food basics", "english": "bread", "answer": "pan", "fill_prompt": "Complete: Necesito el ___.", "fill_answer": "pan"},
            {"title": "Fruit and snacks", "english": "apple", "answer": "manzana", "fill_prompt": "Complete: Quiero una ___.", "fill_answer": "manzana"},
            {"title": "At the café", "english": "I would like a coffee", "answer": "Quisiera un café", "fill_prompt": "Complete: Quisiera un ___.", "fill_answer": "café"},
        ],
    },
    {
        "position": 4,
        "title": "Around Town",
        "description": "Find places, ask for directions, and get around.",
        "skills": [
            {"title": "Places in town", "english": "the station", "answer": "la estación", "fill_prompt": "Complete: Voy a la ___.", "fill_answer": "estación"},
            {"title": "Find your way", "english": "Where is the park?", "answer": "¿Dónde está el parque?", "fill_prompt": "Complete: ¿Dónde ___ el parque?", "fill_answer": "está"},
            {"title": "Getting around", "english": "the bus", "answer": "el autobús", "fill_prompt": "Complete: Voy en ___.", "fill_answer": "autobús"},
        ],
    },
    {
        "position": 5,
        "title": "Daily Life",
        "description": "Talk about your routine, the week, and the time.",
        "skills": [
            {"title": "Days of the week", "english": "Monday", "answer": "lunes", "fill_prompt": "Complete: El primer día es ___.", "fill_answer": "lunes"},
            {"title": "Daily routine", "english": "I get up early", "answer": "Me levanto temprano", "fill_prompt": "Complete: Me ___ temprano.", "fill_answer": "levanto"},
            {"title": "What time is it?", "english": "What time is it?", "answer": "¿Qué hora es?", "fill_prompt": "Complete: ¿Qué ___ es?", "fill_answer": "hora"},
        ],
    },
]


ADDITIONAL_SKILLS = {
    1: [
        {"title": "Numbers 1–5", "english": "one", "answer": "uno", "fill_prompt": "Complete: El número es ___.", "fill_answer": "uno"},
        {"title": "How are you?", "english": "How are you?", "answer": "¿Cómo estás?", "fill_prompt": "Complete: ¿Cómo ___?", "fill_answer": "estás"},
    ],
    2: [
        {"title": "Colors", "english": "red", "answer": "rojo", "fill_prompt": "Complete: El tomate es ___.", "fill_answer": "rojo"},
        {"title": "Around the house", "english": "house", "answer": "casa", "fill_prompt": "Complete: Mi ___ es grande.", "fill_answer": "casa"},
    ],
    3: [
        {"title": "Meals", "english": "breakfast", "answer": "desayuno", "fill_prompt": "Complete: Tomo el ___ por la mañana.", "fill_answer": "desayuno"},
        {"title": "Drinks", "english": "milk", "answer": "leche", "fill_prompt": "Complete: Quiero un vaso de ___.", "fill_answer": "leche"},
    ],
    4: [
        {"title": "Asking the way", "english": "Excuse me, where is the bank?", "answer": "Perdone, ¿dónde está el banco?", "fill_prompt": "Complete: ¿Dónde ___ el banco?", "fill_answer": "está"},
        {"title": "At the station", "english": "ticket", "answer": "billete", "fill_prompt": "Complete: Un ___, por favor.", "fill_answer": "billete"},
    ],
    5: [
        {"title": "Family", "english": "my mother", "answer": "mi madre", "fill_prompt": "Complete: Mi ___ se llama Ana.", "fill_answer": "madre"},
        {"title": "Making plans", "english": "See you tomorrow", "answer": "Hasta mañana", "fill_prompt": "Complete: ¡___ mañana!", "fill_answer": "Hasta"},
    ],
}

EXTRA_EXISTING_EXERCISES = {
    "Introductions": [
        (3, "multiple_choice", "Choose the Spanish for 'I am a student'.", {"choices": ["Soy estudiante", "Buenas noches", "El libro"], "correct_answer": "Soy estudiante"}, "'Soy estudiante' means 'I am a student'."),
        (4, "translate", "Translate: Good afternoon", {"correct_answer": "Buenas tardes"}, "'Buenas tardes' means 'Good afternoon'."),
        (5, "word_bank", "Build the Spanish phrase for 'My name is Ana'.", {"words": ["Me", "llamo", "Ana", "gracias"], "correct_answer": "Me llamo Ana"}, "'Me llamo Ana' means 'My name is Ana'."),
    ],
    "Polite Phrases": [
        (3, "fill_blank", "Complete the Spanish word for 'You're welcome': De ___.", {"correct_answer": "nada"}, "'De nada' means 'You're welcome'."),
        (4, "multiple_choice", "How do you say 'Sorry' in Spanish?", {"choices": ["Perdón", "Por favor", "Hasta luego"], "correct_answer": "Perdón"}, "'Perdón' means 'Sorry' or 'Excuse me'."),
        (5, "translate", "Translate: You're welcome", {"correct_answer": "De nada"}, "'De nada' means 'You're welcome'."),
    ],
    "People": [
        (3, "multiple_choice", "What is the Spanish word for 'book'?", {"choices": ["libro", "amigo", "familia"], "correct_answer": "libro"}, "'Libro' means 'book'."),
        (4, "translate", "Translate: teacher", {"correct_answer": "profesor"}, "'Profesor' means 'teacher'."),
        (5, "fill_blank", "Complete the Spanish phrase for 'my family': Mi ___.", {"correct_answer": "familia"}, "'Mi familia' means 'my family'."),
    ],
}


def _add_exercise(db: Session, lesson: Lesson, position: int, kind: str, prompt: str, config: dict, explanation: str) -> None:
    exists = db.scalar(select(Exercise.id).where(Exercise.lesson_id == lesson.id, Exercise.position == position))
    if exists is None:
        db.add(Exercise(lesson_id=lesson.id, position=position, exercise_type=kind, prompt=prompt, config=config, explanation=explanation))


def _new_lesson_exercises(db: Session, lesson: Lesson, content: dict, unit_answers: list[str]) -> None:
    english, answer = content["english"], content["answer"]
    distractors = [item for item in unit_answers if item != answer]
    for fallback in ["Hola", "Gracias", "Adiós", "Por favor"]:
        if fallback.casefold() != answer.casefold() and fallback not in distractors:
            distractors.append(fallback)
        if len(distractors) == 2:
            break
    choices = [answer, *distractors[:2]]
    words = answer.split() + ["gracias"]
    if "gracias" in answer.split():
        words = answer.split() + ["hola"]
    pairs = [
        {"left": answer, "right": english.title()},
        {"left": "Hola", "right": "Hello"},
        {"left": "Gracias", "right": "Thank you"},
    ]
    exercises = [
        (1, "multiple_choice", f"Choose the Spanish for '{english}'.", {"choices": choices, "correct_answer": answer}, f"'{answer}' means '{english}'."),
        (2, "translate", f"Translate to Spanish: {english}", {"correct_answer": answer}, f"'{answer}' means '{english}'."),
        (3, "fill_blank", content["fill_prompt"], {"correct_answer": content["fill_answer"]}, f"'{answer}' means '{english}'."),
        (4, "word_bank", f"Build the Spanish for '{english}'.", {"words": words, "correct_answer": answer}, f"'{answer}' means '{english}'."),
        (5, "matching", "Match the Spanish phrase with its English meaning.", {"pairs": pairs, "right_options": [pair["right"] for pair in reversed(pairs)], "correct_answer": "|".join(f"{pair['left']}={pair['right']}" for pair in pairs)}, "Match each Spanish phrase to its meaning."),
    ]
    for position, kind, prompt, config, explanation in exercises:
        _add_exercise(db, lesson, position, kind, prompt, config, explanation)


def expand_course(db: Session, course: Course) -> None:
    # Add a few questions to the original shorter lessons; positions make reruns safe.
    for skill_title, questions in EXTRA_EXISTING_EXERCISES.items():
        skill = db.scalar(select(Skill).join(Unit).where(Unit.course_id == course.id, Skill.title == skill_title))
        if skill is None:
            continue
        lesson = db.scalar(select(Lesson).where(Lesson.skill_id == skill.id, Lesson.position == 1))
        if lesson is None:
            continue
        for position, kind, prompt, config, explanation in questions:
            _add_exercise(db, lesson, position, kind, prompt, config, explanation)

    for unit_data in NEW_UNITS:
        unit = db.scalar(select(Unit).where(Unit.course_id == course.id, Unit.position == unit_data["position"]))
        if unit is None:
            unit = Unit(course_id=course.id, position=unit_data["position"], title=unit_data["title"], description=unit_data["description"])
            db.add(unit)
            db.flush()
        for skill_position, content in enumerate(unit_data["skills"], start=1):
            skill = db.scalar(select(Skill).where(Skill.unit_id == unit.id, Skill.title == content["title"]))
            if skill is None:
                skill = Skill(unit_id=unit.id, position=skill_position, title=content["title"], description=content["english"])
                db.add(skill)
                db.flush()
            lesson = db.scalar(select(Lesson).where(Lesson.skill_id == skill.id, Lesson.position == 1))
            if lesson is None:
                lesson = Lesson(skill_id=skill.id, position=1, title=content["title"], xp_reward=20)
                db.add(lesson)
                db.flush()
            _new_lesson_exercises(db, lesson, content, [item["answer"] for item in unit_data["skills"]])

    # Add two more lessons to every unit, preserving existing positions and progress.
    for unit_position, contents in ADDITIONAL_SKILLS.items():
        unit = db.scalar(select(Unit).where(Unit.course_id == course.id, Unit.position == unit_position))
        if unit is None:
            continue
        for content in contents:
            skill = db.scalar(select(Skill).where(Skill.unit_id == unit.id, Skill.title == content["title"]))
            if skill is None:
                last_position = db.scalar(select(func.max(Skill.position)).where(Skill.unit_id == unit.id)) or 0
                skill = Skill(unit_id=unit.id, position=last_position + 1, title=content["title"], description=content["english"])
                db.add(skill)
                db.flush()
            lesson = db.scalar(select(Lesson).where(Lesson.skill_id == skill.id, Lesson.position == 1))
            if lesson is None:
                lesson = Lesson(skill_id=skill.id, position=1, title=content["title"], xp_reward=20)
                db.add(lesson)
                db.flush()
            answers = [item["answer"] for item in contents]
            _new_lesson_exercises(db, lesson, content, answers)
