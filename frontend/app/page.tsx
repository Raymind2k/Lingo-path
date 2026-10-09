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

type MatchingPair = {
  left: string;
  right: string;
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
  const [submitting, setSubmitting] = useState(false);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const [selectedChoice, setSelectedChoice] = useState("");
  const [selectedWordIndexes, setSelectedWordIndexes] = useState<number[]>([]);
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, string>
  >({});
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerFeedback, setAnswerFeedback] =
    useState<AnswerFeedback | null>(null);

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
    setCurrentExerciseIndex(0);
    setLessonFinished(false);
    setXpEarned(0);
    clearCurrentAnswer();

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

  function clearCurrentAnswer() {
    setSelectedChoice("");
    setSelectedWordIndexes([]);
    setMatchingAnswers({});
    setTypedAnswer("");
    setAnswerFeedback(null);
    setLessonError(null);
  }

  function getWordBankWords(exercise: Exercise): string[] {
    const words = exercise.config.words;

    return Array.isArray(words)
      ? words.filter((word): word is string => typeof word === "string")
      : [];
  }

  function getMatchingPairs(exercise: Exercise): MatchingPair[] {
    const pairs = exercise.config.pairs;

    if (!Array.isArray(pairs)) {
      return [];
    }

    return pairs.filter(
      (pair): pair is MatchingPair =>
        typeof pair === "object" &&
        pair !== null &&
        "left" in pair &&
        "right" in pair &&
        typeof pair.left === "string" &&
        typeof pair.right === "string",
    );
  }

  function getMatchingOptions(exercise: Exercise): string[] {
    const options = exercise.config.right_options;

    return Array.isArray(options)
      ? options.filter((option): option is string => typeof option === "string")
      : [];
  }

  async function submitAnswer() {
    if (!lesson) return;

    const exercise = lesson.exercises[currentExerciseIndex];
    if (!exercise) return;

    let answer = "";

    if (exercise.exercise_type === "word_bank") {
      const words = getWordBankWords(exercise);
      answer = selectedWordIndexes.map((index) => words[index]).join(" ");
    } else if (exercise.exercise_type === "matching") {
      const pairs = getMatchingPairs(exercise);

      if (pairs.length === 0 || pairs.some((pair) => !matchingAnswers[pair.left])) {
        setLessonError("Choose a match for every item before checking.");
        return;
      }

      answer = pairs
        .map((pair) => `${pair.left}=${matchingAnswers[pair.left]}`)
        .join("|");
    } else {
      answer = selectedChoice || typedAnswer;
    }

    if (!answer.trim()) {
      setLessonError("Choose or type an answer before checking it.");
      return;
    }

    setLessonError(null);
    setSubmitting(true);

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

      const feedback = result as AnswerFeedback;
      setAnswerFeedback(feedback);

      await refreshDashboard();

      if (
        feedback.correct &&
        currentExerciseIndex === lesson.exercises.length - 1
      ) {
        setXpEarned(feedback.xp_awarded);
        setLessonFinished(true);
      }
    } catch (error) {
      setLessonError(
        error instanceof Error ? error.message : "Could not submit your answer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function continueToNextQuestion() {
    if (!lesson || !answerFeedback?.correct) return;

    setCurrentExerciseIndex((index) => index + 1);
    clearCurrentAnswer();
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

  const currentExercise = lesson?.exercises[currentExerciseIndex];
  const currentWords = currentExercise
    ? getWordBankWords(currentExercise)
    : [];
  const currentPairs = currentExercise
    ? getMatchingPairs(currentExercise)
    : [];
  const currentMatchingOptions = currentExercise
    ? getMatchingOptions(currentExercise)
    : [];
  const rawChoices = currentExercise?.config.choices;
  const currentChoices = Array.isArray(rawChoices)
    ? rawChoices.filter(
        (choice): choice is string => typeof choice === "string",
      )
    : [];

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
              setLessonFinished(false);
            }}
            type="button"
          >
            ← Back to learning path
          </button>

          {lessonFinished ? (
            <section className="message-card">
              <p className="eyebrow">LESSON COMPLETE</p>
              <h1>Great work!</h1>
              <p>
                {xpEarned > 0
                  ? `You earned ${xpEarned} XP.`
                  : "This lesson’s XP reward was already earned."}
              </p>
              <button
                className="lesson-back-button"
                onClick={() => {
                  setLesson(null);
                  setLessonFinished(false);
                }}
                type="button"
              >
                Return to learning path
              </button>
            </section>
          ) : currentExercise ? (
            <>
              <p className="eyebrow">
                QUESTION {currentExerciseIndex + 1} OF {lesson.exercises.length}
              </p>
              <h1>{lesson.title}</h1>
              <p>{currentExercise.prompt}</p>

              {lessonError && (
                <section className="message-card error-card">
                  <p>{lessonError}</p>
                </section>
              )}

              <div className="lesson-exercises">
                <article className="unit-card">
                  <p className="unit-number">
                    {currentExercise.exercise_type.replaceAll("_", " ")}
                  </p>

                  {currentExercise.exercise_type === "word_bank" ? (
                    <div style={{ marginTop: 20 }}>
                      <p style={{ color: "#60728a", fontSize: 14 }}>
                        Tap the words in order. Tap a selected word to remove
                        it.
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
                        {selectedWordIndexes.map((wordIndex, position) => (
                          <button
                            className="exercise-choice exercise-choice-selected"
                            disabled={answerFeedback?.correct}
                            key={`${wordIndex}-${position}`}
                            onClick={() =>
                              setSelectedWordIndexes((previous) =>
                                previous.filter((_, index) => index !== position),
                              )
                            }
                            type="button"
                          >
                            {currentWords[wordIndex]}
                          </button>
                        ))}
                      </div>

                      <div className="exercise-choices" aria-label="Word bank">
                        {currentWords.map((word, index) => {
                          const isSelected = selectedWordIndexes.includes(index);

                          return (
                            <button
                              className="exercise-choice"
                              disabled={isSelected || answerFeedback?.correct}
                              key={`${word}-${index}`}
                              onClick={() =>
                                setSelectedWordIndexes((previous) => [
                                  ...previous,
                                  index,
                                ])
                              }
                              type="button"
                            >
                              {word}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : currentExercise.exercise_type === "matching" ? (
                    <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
                      {currentPairs.map((pair) => (
                        <label
                          key={pair.left}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              padding: 12,
                              border: "1px solid #e2e8f0",
                              borderRadius: 10,
                              background: "#f8fafc",
                              fontWeight: 700,
                            }}
                          >
                            {pair.left}
                          </span>
                          <select
                            className="exercise-input"
                            disabled={answerFeedback?.correct}
                            onChange={(event) =>
                              setMatchingAnswers((previous) => ({
                                ...previous,
                                [pair.left]: event.target.value,
                              }))
                            }
                            value={matchingAnswers[pair.left] ?? ""}
                          >
                            <option value="">Choose a match</option>
                            {currentMatchingOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  ) : currentChoices.length > 0 ? (
                    <div className="exercise-choices">
                      {currentChoices.map((choice) => (
                        <button
                          className={`exercise-choice ${
                            selectedChoice === choice
                              ? "exercise-choice-selected"
                              : ""
                          }`}
                          disabled={answerFeedback?.correct}
                          key={choice}
                          onClick={() => setSelectedChoice(choice)}
                          type="button"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="exercise-input"
                      disabled={answerFeedback?.correct}
                      onChange={(event) => setTypedAnswer(event.target.value)}
                      placeholder="Type your answer"
                      value={typedAnswer}
                    />
                  )}

                  <button
                    disabled={submitting || answerFeedback?.correct}
                    onClick={submitAnswer}
                    style={{
                      marginTop: 16,
                      padding: "12px 18px",
                      border: 0,
                      borderRadius: 10,
                      background: "#172b4d",
                      color: "white",
                      cursor: submitting ? "wait" : "pointer",
                      font: "inherit",
                      fontWeight: 700,
                    }}
                    type="button"
                  >
                    {submitting ? "Checking…" : "Check answer"}
                  </button>

                  {answerFeedback && (
                    <div
                      aria-live="polite"
                      style={{
                        marginTop: 16,
                        color: answerFeedback.correct ? "#398000" : "#a33",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>{answerFeedback.feedback}</strong>
                      {!answerFeedback.correct && (
                        <p>Correct answer: {answerFeedback.correct_answer}</p>
                      )}
                      {answerFeedback.explanation && (
                        <p>{answerFeedback.explanation}</p>
                      )}
                    </div>
                  )}

                  {answerFeedback?.correct &&
                    currentExerciseIndex < lesson.exercises.length - 1 && (
                      <button
                        className="lesson-back-button"
                        onClick={continueToNextQuestion}
                        style={{ marginTop: 16 }}
                        type="button"
                      >
                        Continue
                      </button>
                    )}
                </article>
              </div>
            </>
          ) : (
            <section className="message-card">
              <h1>This lesson has no exercises yet.</h1>
            </section>
          )}
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
                {Math.min(profile.today_xp, profile.daily_xp_goal)} / {profile.daily_xp_goal} XP
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