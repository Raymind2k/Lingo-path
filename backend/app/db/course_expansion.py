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
    {
        "position": 6,
        "title": "Travel and Transport",
        "description": "Buy tickets, use public transport, and travel with confidence.",
        "skills": [
            {"title": "At the airport", "english": "Where is the gate?", "answer": "¿Dónde está la puerta?", "fill_prompt": "Complete: ¿Dónde está la ___?", "fill_answer": "puerta"},
            {"title": "Buying a ticket", "english": "One ticket, please", "answer": "Un billete, por favor", "fill_prompt": "Complete: Un ___, por favor.", "fill_answer": "billete"},
            {"title": "On the bus", "english": "I need the bus", "answer": "Necesito el autobús", "fill_prompt": "Complete: Necesito el ___.", "fill_answer": "autobús"},
            {"title": "By train", "english": "The train is fast", "answer": "El tren es rápido", "fill_prompt": "Complete: El tren es ___.", "fill_answer": "rápido"},
        ],
    },
    {
        "position": 7,
        "title": "At the Market",
        "description": "Find fresh food, ask prices, and shop in Spanish.",
        "skills": [
            {"title": "Fresh fruit", "english": "I would like some apples", "answer": "Quisiera unas manzanas", "fill_prompt": "Complete: Quisiera unas ___.", "fill_answer": "manzanas"},
            {"title": "Ask the price", "english": "How much does it cost?", "answer": "¿Cuánto cuesta?", "fill_prompt": "Complete: ¿Cuánto ___?", "fill_answer": "cuesta"},
            {"title": "At the cheese counter", "english": "Some cheese, please", "answer": "Un poco de queso, por favor", "fill_prompt": "Complete: Un poco de ___, por favor.", "fill_answer": "queso"},
            {"title": "Buying a drink", "english": "A bottle of water", "answer": "Una botella de agua", "fill_prompt": "Complete: Una botella de ___.", "fill_answer": "agua"},
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
        {"title": "Turn left", "english": "Turn left", "answer": "Gira a la izquierda", "fill_prompt": "Complete: Gira a la ___.", "fill_answer": "izquierda"},
        {"title": "Turn right", "english": "Turn right", "answer": "Gira a la derecha", "fill_prompt": "Complete: Gira a la ___.", "fill_answer": "derecha"},
    ],
    5: [
        {"title": "Family", "english": "my mother", "answer": "mi madre", "fill_prompt": "Complete: Mi ___ se llama Ana.", "fill_answer": "madre"},
        {"title": "Making plans", "english": "See you tomorrow", "answer": "Hasta mañana", "fill_prompt": "Complete: ¡___ mañana!", "fill_answer": "Hasta"},
    ],
}

# Fill each existing unit out to ten lesson nodes. These are appended to the
# curriculum without changing the position or progress of any existing skill.
TEN_NODE_SKILLS = {
    1: [
        {"title": "Say goodbye", "english": "See you later", "answer": "Hasta luego", "fill_prompt": "Complete: Hasta ___.", "fill_answer": "luego"},
        {"title": "Where are you from?", "english": "I am from Spain", "answer": "Soy de España", "fill_prompt": "Complete: Soy ___ España.", "fill_answer": "de"},
        {"title": "Languages", "english": "I speak Spanish", "answer": "Hablo español", "fill_prompt": "Complete: Hablo ___.", "fill_answer": "español"},
        {"title": "Classroom words", "english": "the book", "answer": "el libro", "fill_prompt": "Complete: Leo ___ libro.", "fill_answer": "el"},
        {"title": "Yes and no", "english": "No, thank you", "answer": "No, gracias", "fill_prompt": "Complete: No, ___.", "fill_answer": "gracias"},
        {"title": "Introduce a friend", "english": "This is my friend", "answer": "Este es mi amigo", "fill_prompt": "Complete: Este ___ mi amigo.", "fill_answer": "es"},
    ],
    2: [
        {"title": "Family", "english": "my sister", "answer": "mi hermana", "fill_prompt": "Complete: ___ hermana.", "fill_answer": "mi"},
        {"title": "Common objects", "english": "the table", "answer": "la mesa", "fill_prompt": "Complete: La comida está en la ___.", "fill_answer": "mesa"},
        {"title": "Animals", "english": "the dog", "answer": "el perro", "fill_prompt": "Complete: ___ perro.", "fill_answer": "el"},
        {"title": "Days of the week", "english": "Tuesday", "answer": "martes", "fill_prompt": "Complete: El segundo día es ___.", "fill_answer": "martes"},
        {"title": "Describe something", "english": "It is small", "answer": "Es pequeño", "fill_prompt": "Complete: Es ___.", "fill_answer": "pequeño"},
        {"title": "Useful questions", "english": "What is this?", "answer": "¿Qué es esto?", "fill_prompt": "Complete: ¿___ es esto?", "fill_answer": "Qué"},
    ],
    3: [
        {"title": "Vegetables", "english": "the tomato", "answer": "el tomate", "fill_prompt": "Complete: La ensalada lleva ___.", "fill_answer": "tomate"},
        {"title": "At breakfast", "english": "I eat bread", "answer": "Como pan", "fill_prompt": "Complete: ___ pan.", "fill_answer": "Como"},
        {"title": "Order politely", "english": "A tea, please", "answer": "Un té, por favor", "fill_prompt": "Complete: Un ___, por favor.", "fill_answer": "té"},
        {"title": "Food I like", "english": "I like cheese", "answer": "Me gusta el queso", "fill_prompt": "Complete: Me gusta el ___.", "fill_answer": "queso"},
        {"title": "Ask for water", "english": "Can I have water?", "answer": "¿Puedo tomar agua?", "fill_prompt": "Complete: ¿Puedo tomar ___?", "fill_answer": "agua"},
    ],
    4: [
        {"title": "Go straight", "english": "Go straight ahead", "answer": "Sigue todo recto", "fill_prompt": "Complete: Sigue todo ___.", "fill_answer": "recto"},
        {"title": "Nearby places", "english": "The museum is nearby", "answer": "El museo está cerca", "fill_prompt": "Complete: El museo está ___.", "fill_answer": "cerca"},
        {"title": "Find the pharmacy", "english": "Where is the pharmacy?", "answer": "¿Dónde está la farmacia?", "fill_prompt": "Complete: ¿Dónde está la ___?", "fill_answer": "farmacia"},
    ],
    5: [
        {"title": "Morning routine", "english": "I have breakfast", "answer": "Desayuno", "fill_prompt": "Por la mañana, ___.", "fill_answer": "desayuno"},
        {"title": "The weekend", "english": "On Saturday", "answer": "El sábado", "fill_prompt": "Complete: ___ sábado.", "fill_answer": "El"},
        {"title": "At home", "english": "I am at home", "answer": "Estoy en casa", "fill_prompt": "Complete: Estoy ___ casa.", "fill_answer": "en"},
        {"title": "Make a plan", "english": "Let's meet tomorrow", "answer": "Quedamos mañana", "fill_prompt": "Complete: Quedamos ___.", "fill_answer": "mañana"},
        {"title": "How often?", "english": "I always study", "answer": "Siempre estudio", "fill_prompt": "Complete: ___ estudio.", "fill_answer": "Siempre"},
    ],
    6: [
        {"title": "Check in", "english": "I have a reservation", "answer": "Tengo una reserva", "fill_prompt": "Complete: Tengo una ___.", "fill_answer": "reserva"},
        {"title": "Find the platform", "english": "Where is platform two?", "answer": "¿Dónde está el andén dos?", "fill_prompt": "Complete: ¿Dónde está el ___ dos?", "fill_answer": "andén"},
        {"title": "Arriving in the city", "english": "We arrive today", "answer": "Llegamos hoy", "fill_prompt": "Complete: Llegamos ___.", "fill_answer": "hoy"},
        {"title": "Find the restroom", "english": "Where is the restroom?", "answer": "¿Dónde está el baño?", "fill_prompt": "Complete: ¿Dónde está el ___?", "fill_answer": "baño"},
        {"title": "A return ticket", "english": "A return ticket, please", "answer": "Un billete de ida y vuelta, por favor", "fill_prompt": "Complete: Un billete de ida y ___, por favor.", "fill_answer": "vuelta"},
        {"title": "My luggage", "english": "Where is my suitcase?", "answer": "¿Dónde está mi maleta?", "fill_prompt": "Complete: ¿Dónde está mi ___?", "fill_answer": "maleta"},
    ],
    7: [
        {"title": "At the greengrocer", "english": "Some carrots", "answer": "Unas zanahorias", "fill_prompt": "Complete: Unas ___.", "fill_answer": "zanahorias"},
        {"title": "How many?", "english": "Half a kilo of apples", "answer": "Medio kilo de manzanas", "fill_prompt": "Complete: ___ kilo de manzanas.", "fill_answer": "Medio"},
        {"title": "Ask for a bag", "english": "Could I have a bag?", "answer": "¿Me da una bolsa?", "fill_prompt": "Complete: ¿Me da una ___?", "fill_answer": "bolsa"},
        {"title": "Pay at the market", "english": "Can I pay by card?", "answer": "¿Puedo pagar con tarjeta?", "fill_prompt": "Complete: ¿Puedo pagar con ___?", "fill_answer": "tarjeta"},
        {"title": "At the bakery", "english": "A loaf of bread", "answer": "Una barra de pan", "fill_prompt": "Complete: Una barra de ___.", "fill_answer": "pan"},
        {"title": "Compare prices", "english": "This one is cheaper", "answer": "Este es más barato", "fill_prompt": "Complete: Este es más ___.", "fill_answer": "barato"},
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
    # Rotate the order so opening consecutive nodes presents a different first
    # question format while every lesson still practices all five formats.
    skill_position = lesson.skill.position if lesson.skill is not None else 1
    offset = (skill_position - 1) % len(exercises)
    ordered_exercises = exercises[offset:] + exercises[:offset]
    for position, (_, kind, prompt, config, explanation) in enumerate(ordered_exercises, start=1):
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

    # Add enough distinct lesson nodes to bring every original unit to ten.
    for unit_position, contents in TEN_NODE_SKILLS.items():
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
