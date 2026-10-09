"use client";

import { useCallback, useEffect, useState } from "react";

type LessonSummary = {
  id: number;
  position: number;
  title: string;
  xp_reward: number;
};

type Skill = {
  id: number;
  position: number;
  title: string;
  lessons: LessonSummary[];
  progress: {
    status: "locked" | "available" | "completed";
    crowns: number;
  };
};

type Unit = {
  id: number;
  position: number;
  title: string;
  description: string | null;
  skills: Skill[];
};

type LearningPath = {
  learner: {
    username: string;
    display_name: string;
  };
  course: {
    slug: string;
    name: string;
    source_language: string;
    target_language: string;
    units: Unit[];
  };
};

type Profile = {
  username: string;
  display_name: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  hearts: number;
  max_hearts: number;
  daily_xp_goal: number;
  today_xp: number;
  daily_goal_met: boolean;
};

type Exercise = {
  id: number;
  position: number;
  exercise_type: string;
  prompt: string;
  config: Record<string, unknown>;
};

type Lesson = {
  id: number;
  title: string;
  xp_reward: number;
  exercises: Exercise[];
};

type AnswerFeedback = {
  correct: boolean;
  feedback: string;
  correct_answer: string | null;
  explanation: string | null;
  hearts_remaining: number;
  xp_awarded: number;
  lesson_completed: boolean;
  unlocked_skill: number | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json();
}

export default function Home() {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [submittingExercise, setSubmittingExercise] = useState<number | null>(
    null,
  );
  const [selectedChoices, setSelectedChoices] = useState<
    Record<number, string>
  >({});
  const [selectedWordIndexes, setSelectedWordIndexes] = useState<
    Record<number, number[]>
  >({});
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});
  const [feedbackByExercise, setFeedbackByExercise] = useState<
    Record<number, AnswerFeedback>
  >({});

  const refreshDashboard = useCallback(async () => {
    const [pathData, profileData] = await Promise.all([
      getJson<LearningPath>(`${API_URL}/path/demo-learner`),
      getJson<Profile>(`${API_URL}/profile/demo-learner`),
    ]);

    setPath(pathData);
    setProfile(profileData);
  }, []);

  useEffect(() => {
    refreshDashboard().catch((error: unknown) => {
      setPageError(
        error instanceof Error ? error.message : "Could not load your course.",
      );
    });
  }, [refreshDashboard]);

  async function openLesson(lessonId: number) {
    setLesson(null);
    setLessonError(null);
    setLessonLoading(true);
    setSelectedChoices({});
    setSelectedWordIndexes({});
    setTypedAnswers({});
    setFeedbackByExercise({});

    try {
      const lessonData = await getJson<Lesson>(
        `${API_URL}/lessons/${lessonId}?username=demo-learner`,
      );
      setLesson(lessonData);
    } catch (error) {
      setLessonError(
        error instanceof Error ? error.message : "Could not load the lesson.",
      );
    } finally {
      setLessonLoading(false);
    }
  }

  function getWordBankWords(exercise: Exercise): string[] {
    const words = exercise.config.words;

    if (!Array.isArray(words)) {
      return [];
    }

    return words.filter(
      (word): word is string => typeof word === "string",
    );
  }

  async function submitAnswer(exercise: Exercise) {
    if (!lesson) return;

    let answer = "";

    if (exercise.exercise_type === "word_bank") {
      const words = getWordBankWords(exercise);
      const selectedIndexes = selectedWordIndexes[exercise.id] ?? [];
      answer = selectedIndexes.map((index) => words[index]).join(" ");
    } else {
      answer =
        selectedChoices[exercise.id] ?? typedAnswers[exercise.id] ?? "";
    }

    if (!answer.trim()) {
      setLessonError("Choose or type an answer before checking it.");
      return;
    }

    setLessonError(null);
    setSubmittingExercise(exercise.id);

    try {
      const response = await fetch(
        `${API_URL}/lessons/${lesson.id}/answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "demo-learner",
            exercise_id: exercise.id,
            answer,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail ?? "Could not submit your answer.");
      }

      setFeedbackByExercise((previous) => ({
        ...previous,
        [exercise.id]: result as AnswerFeedback,
      }));

      await refreshDashboard();
    } catch (error) {
      setLessonError(
        error instanceof Error ? error.message : "Could not submit your answer.",
      );
    } finally {
      setSubmittingExercise(null);
    }
  }

  if (pageError) {
    return (
      <main className="page-shell">
        <section className="message-card error-card">
          <h1>Couldn’t load your course</h1>
          <p>{pageError}</p>
          <p>Check that the FastAPI server is running, then refresh.</p>
        </section>
      </main>
    );
  }

  if (!path || !profile) {
    return (
      <main className="page-shell">
        <section className="message-card">
          <p className="eyebrow">LINGO PATH</p>
          <h1>Loading your learning path…</h1>
        </section>
      </main>
    );
  }

  const dailyGoalPercent =
    profile.daily_xp_goal > 0
      ? Math.min(100, (profile.today_xp / profile.daily_xp_goal) * 100)
      : 100;

  return (
    <main className="page-shell">
      <header className="top-bar">
        <a className="brand" href="/">
          <span className="brand-mark">L</span>
          Lingo Path
        </a>
        <div className="learner-label">
          <strong>{path.learner.display_name}</strong>
        </div>
      </header>

      <section
        aria-label="Learner statistics"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 20,
        }}
      >
        <div className="sidebar-stat">
          <span>❤️ Hearts</span>
          <strong>
            {profile.hearts}/{profile.max_hearts}
          </strong>
        </div>
        <div className="sidebar-stat">
          <span>⚡ Total XP</span>
          <strong>{profile.total_xp}</strong>
        </div>
        <div className="sidebar-stat">
          <span>🔥 Current streak</span>
          <strong>{profile.current_streak} days</strong>
        </div>
      </section>

      {lesson ? (
        <section className="course-header">
          <button
            className="lesson-back-button"
            onClick={() => {
              setLesson(null);
              setLessonError(null);
            }}
            type="button"
          >
            ← Back to learning path
          </button>

          <p className="eyebrow">LESSON · {lesson.xp_reward} XP</p>
          <h1>{lesson.title}</h1>
          <p>Answer each question, then select “Check answer”.</p>

          {lessonError && (
            <section className="message-card error-card">
              <p>{lessonError}</p>
            </section>
          )}

          <div className="lesson-exercises">
            {lesson.exercises.map((exercise) => {
              const rawChoices = exercise.config.choices;
              const choices = Array.isArray(rawChoices)
                ? rawChoices.filter(
                    (choice): choice is string => typeof choice === "string",
                  )
                : [];
              const wordBankWords = getWordBankWords(exercise);
              const chosenWordIndexes =
                selectedWordIndexes[exercise.id] ?? [];
              const feedback = feedbackByExercise[exercise.id];
              const alreadyCorrect = feedback?.correct === true;

              return (
                <article className="unit-card" key={exercise.id}>
                  <p className="unit-number">
                    QUESTION {exercise.position} ·{" "}
                    {exercise.exercise_type.replaceAll("_", " ")}
                  </p>
                  <h2>{exercise.prompt}</h2>

                  {exercise.exercise_type === "word_bank" ? (
                    <div style={{ marginTop: 20 }}>
                      <p style={{ color: "#60728a", fontSize: 14 }}>
                        Tap the words in the correct order. Tap a selected word
                        to remove it.
                      </p>

                      <div
                        aria-label="Your answer"
                        className="exercise-choices"
                        style={{
                          minHeight: 52,
                          padding: 10,
                          border: "2px dashed #cbd5e1",
                          borderRadius: 12,
                        }}
                      >
                        {chosenWordIndexes.map((wordIndex, selectedPosition) => (
                          <button
                            className="exercise-choice exercise-choice-selected"
                            disabled={alreadyCorrect}
                            key={`${wordIndex}-${selectedPosition}`}
                            onClick={() =>
                              setSelectedWordIndexes((previous) => ({
                                ...previous,
                                [exercise.id]: chosenWordIndexes.filter(
                                  (_, index) => index !== selectedPosition,
                                ),
                              }))
                            }
                            type="button"
                          >
                            {wordBankWords[wordIndex]}
                          </button>
                        ))}
                      </div>

                      <div
                        aria-label="Word bank"
                        className="exercise-choices"
                      >
                        {wordBankWords.map((word, wordIndex) => {
                          const isSelected =
                            chosenWordIndexes.includes(wordIndex);

                          return (
                            <button
                              className="exercise-choice"
                              disabled={isSelected || alreadyCorrect}
                              key={`${word}-${wordIndex}`}
                              onClick={() =>
                                setSelectedWordIndexes((previous) => ({
                                  ...previous,
                                  [exercise.id]: [
                                    ...(previous[exercise.id] ?? []),
                                    wordIndex,
                                  ],
                                }))
                              }
                              style={{
                                opacity: isSelected ? 0.4 : 1,
                                cursor: isSelected ? "default" : "pointer",
                              }}
                              type="button"
                            >
                              {word}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : choices.length > 0 ? (
                    <div className="exercise-choices">
                      {choices.map((choice) => (
                        <button
                          className={`exercise-choice ${
                            selectedChoices[exercise.id] === choice
                              ? "exercise-choice-selected"
                              : ""
                          }`}
                          disabled={alreadyCorrect}
                          key={choice}
                          onClick={() => {
                            setSelectedChoices((previous) => ({
                              ...previous,
                              [exercise.id]: choice,
                            }));
                            setLessonError(null);
                          }}
                          type="button"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="exercise-input"
                      disabled={alreadyCorrect}
                      onChange={(event) => {
                        setTypedAnswers((previous) => ({
                          ...previous,
                          [exercise.id]: event.target.value,
                        }));
                        setLessonError(null);
                      }}
                      placeholder="Type your answer"
                      value={typedAnswers[exercise.id] ?? ""}
                    />
                  )}

                  <button
                    disabled={
                      alreadyCorrect || submittingExercise === exercise.id
                    }
                    onClick={() => submitAnswer(exercise)}
                    style={{
                      marginTop: 16,
                      padding: "12px 18px",
                      border: 0,
                      borderRadius: 10,
                      background: alreadyCorrect ? "#58a700" : "#172b4d",
                      color: "white",
                      cursor: alreadyCorrect ? "default" : "pointer",
                      font: "inherit",
                      fontWeight: 700,
                    }}
                    type="button"
                  >
                    {submittingExercise === exercise.id
                      ? "Checking…"
                      : alreadyCorrect
                        ? "Correct"
                        : "Check answer"}
                  </button>

                  {feedback && (
                    <div
                      aria-live="polite"
                      style={{
                        marginTop: 16,
                        color: feedback.correct ? "#398000" : "#a33",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>{feedback.feedback}</strong>
                      {!feedback.correct && (
                        <p>Correct answer: {feedback.correct_answer}</p>
                      )}
                      {feedback.explanation && <p>{feedback.explanation}</p>}
                      {feedback.xp_awarded > 0 && (
                        <p>You earned {feedback.xp_awarded} XP!</p>
                      )}
                      {feedback.unlocked_skill && (
                        <p>The next skill is now unlocked!</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="course-header">
            <p className="eyebrow">
              {path.course.source_language} → {path.course.target_language}
            </p>
            <h1>{path.course.name}</h1>
            <p>Choose an available skill to open its lesson.</p>
          </section>

          {lessonLoading && (
            <section className="message-card">
              <p>Loading lesson…</p>
            </section>
          )}

          {lessonError && (
            <section className="message-card error-card">
              <p>{lessonError}</p>
            </section>
          )}

          <div className="path-layout">
            <section className="units" aria-label="Course learning path">
              {path.course.units.map((unit) => (
                <article className="unit-card" key={unit.id}>
                  <p className="unit-number">UNIT {unit.position}</p>
                  <h2>{unit.title}</h2>
                  {unit.description && <p>{unit.description}</p>}

                  <div className="skills-list">
                    {unit.skills.map((skill) => {
                      const canOpen =
                        skill.progress.status === "available" ||
                        skill.progress.status === "completed";
                      const firstLesson = skill.lessons[0];

                      return (
                        <button
                          className={`skill-card status-${skill.progress.status}`}
                          disabled={!canOpen || !firstLesson || lessonLoading}
                          key={skill.id}
                          onClick={() => {
                            if (firstLesson) openLesson(firstLesson.id);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            font: "inherit",
                            cursor:
                              canOpen && firstLesson ? "pointer" : "not-allowed",
                          }}
                          type="button"
                        >
                          <span className="skill-icon" aria-hidden="true">
                            {skill.progress.status === "completed"
                              ? "✓"
                              : canOpen
                                ? "★"
                                : "🔒"}
                          </span>
                          <span className="skill-info">
                            <strong>{skill.title}</strong>
                            <p>
                              {skill.lessons.length} lesson
                              {skill.lessons.length === 1 ? "" : "s"} ·{" "}
                              {skill.progress.crowns} crowns
                            </p>
                            {skill.lessons.map((item) => (
                              <span className="lesson-label" key={item.id}>
                                {item.title} · {item.xp_reward} XP
                              </span>
                            ))}
                          </span>
                          <span className="status-label">
                            {skill.progress.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>

            <aside className="sidebar-card">
              <p className="eyebrow">DAILY GOAL</p>
              <h2>
                {profile.today_xp} / {profile.daily_xp_goal} XP
              </h2>
              <progress
                aria-label="Daily XP goal progress"
                max={profile.daily_xp_goal || 1}
                value={Math.min(profile.today_xp, profile.daily_xp_goal)}
                style={{ width: "100%", accentColor: "#58a700" }}
              />
              <p>
                {profile.daily_goal_met
                  ? "Daily goal complete!"
                  : "Keep learning to reach your goal."}
              </p>
              <div className="sidebar-stat">
                <span>Longest streak</span>
                <strong>{profile.longest_streak} days</strong>
              </div>
              <div className="sidebar-stat">
                <span>Course units</span>
                <strong>{path.course.units.length}</strong>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}