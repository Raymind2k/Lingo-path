"use client";

import { useCallback, useEffect, useState } from "react";
import PrimaryNavigation from "./components/PrimaryNavigation";

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

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

type DailyQuest = { id: string; title: string; icon: string; progress: number; target: number; completed: boolean };
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
  heart_refill_seconds: number | null;
  daily_quests: DailyQuest[];
  monthly_quest: { title: string; progress: number; target: number; completed: boolean; days_remaining: number };
  achievements?: Achievement[];
};

type LeaderboardEntry = {
  rank: number;
  username: string;
  display_name: string;
  total_xp: number;
  current_streak: number;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
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

function RandomBird() {
  const [pose, setPose] = useState("center");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    const poses = ["left", "right", "up", "down", "tilt-left", "tilt-right"];

    const moveHead = () => {
      if (!active) return;
      setPose(poses[Math.floor(Math.random() * poses.length)]);
      timer = setTimeout(moveHead, 700 + Math.random() * 2600);
    };

    timer = setTimeout(moveHead, 500 + Math.random() * 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <span className="duo-bird" aria-label="Duo the owl">
      <span className="duo-bird-body">
        <span className="duo-bird-wing" />
        <span className="duo-bird-feet">● ●</span>
      </span>
      <span className={`duo-bird-head pose-${pose}`}>
        <span className="duo-bird-eyes">
          <i />
          <i />
        </span>
        <span className="duo-bird-beak" />
      </span>
    </span>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [refillingHearts, setRefillingHearts] = useState(false);
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
    const [pathData, profileData, leaderboardData] = await Promise.all([
      getJson<LearningPath>(`${API_URL}/path/demo-learner`),
      getJson<Profile>(`${API_URL}/profile/demo-learner`),
      getJson<LeaderboardResponse>(`${API_URL}/leaderboard`),
    ]);

    setPath(pathData);
    setProfile(profileData);
    setLeaderboard(leaderboardData.leaderboard ?? []);
  }, []);

  useEffect(() => {
    refreshDashboard()
      .then(() => {
        const lessonId = Number(new URLSearchParams(window.location.search).get("lesson_id"));
        if (Number.isInteger(lessonId) && lessonId > 0) openLesson(lessonId);
      })
      .catch((error: unknown) => {
        setPageError(error instanceof Error ? error.message : "Could not load your course.");
      });
    // Read the initial route query once, without restarting a lesson on state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshDashboard]);

  useEffect(() => {
  const savedTheme = window.localStorage.getItem("lingo-path-theme");
  const useDarkMode = savedTheme !== "light";

  setDarkMode(useDarkMode);
  document.documentElement.dataset.theme = useDarkMode ? "dark" : "light";
}, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      getJson<Profile>(`${API_URL}/profile/demo-learner`).then(setProfile).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (outOfHearts && profile && profile.hearts > 0) setOutOfHearts(false);
  }, [outOfHearts, profile]);

  async function openLesson(lessonId: number) {
    setLesson(null);
    setLessonError(null);
    setLessonLoading(true);
    setCurrentExerciseIndex(0);
    setLessonFinished(false);
    setOutOfHearts(false);
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

  async function refillHearts() {
    setRefillingHearts(true);
    setLessonError(null);
    try {
      const response = await fetch(`${API_URL}/profile/demo-learner/refill-hearts`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Could not refill hearts.");
      await refreshDashboard();
      setOutOfHearts(false);
      setAnswerFeedback(null);
    } catch (error) {
      setLessonError(error instanceof Error ? error.message : "Could not refill hearts.");
    } finally {
      setRefillingHearts(false);
    }
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

  function getSpeechLanguage(language: string): string {
    const normalizedLanguage = language.toLowerCase();

    if (normalizedLanguage.includes("spanish")) return "es-ES";
    if (normalizedLanguage.includes("french")) return "fr-FR";
    if (normalizedLanguage.includes("german")) return "de-DE";
    if (normalizedLanguage.includes("italian")) return "it-IT";
    if (normalizedLanguage.includes("portuguese")) return "pt-PT";
    if (normalizedLanguage.includes("english")) return "en-US";

    return "es-ES";
  }

  function getCurrentAnswerForSpeech(exercise: Exercise): string {
    if (exercise.exercise_type === "word_bank") {
      const words = getWordBankWords(exercise);
      return selectedWordIndexes.map((index) => words[index]).join(" ");
    }

    if (exercise.exercise_type === "matching") {
      return getMatchingPairs(exercise)
        .map((pair) => pair.left)
        .join(". ");
    }

    const rawChoices = exercise.config.choices;
    const choices = Array.isArray(rawChoices)
      ? rawChoices.filter(
          (choice): choice is string => typeof choice === "string",
        )
      : [];

    if (choices.length > 0) {
      return selectedChoice;
    }

    return typedAnswer;
  }

  function speakText(text: string, language: string) {
    if (!text.trim()) {
      setLessonError("Choose or type an answer before playing its audio.");
      return;
    }

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      setLessonError("Audio playback is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLanguage(language);
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
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

      if (
        pairs.length === 0 ||
        pairs.some((pair) => !matchingAnswers[pair.left])
      ) {
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
      const response = await fetch(`${API_URL}/lessons/${lesson.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "demo-learner",
          exercise_id: exercise.id,
          answer,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const detail = result.detail ?? "Could not submit your answer.";
        if (String(detail).toLowerCase().includes("no hearts")) setOutOfHearts(true);
        throw new Error(detail);
      }

      const feedback = result as AnswerFeedback;
      setAnswerFeedback(feedback);
      if (feedback.hearts_remaining <= 0) setOutOfHearts(true);

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
  const currentSpeechText = currentExercise
    ? getCurrentAnswerForSpeech(currentExercise)
    : "";
  const dailyQuests = profile.daily_quests ?? [];

  return (
    <main className="page-shell">
      <PrimaryNavigation activePage="learn" />
      <header className="top-bar">
        <a className="brand" href="/">
          <span className="brand-mark">L</span>
          Lingo Path
        </a>
        <div className="header-actions">
          <div className="learner-label">
            <strong>{path.learner.display_name}</strong>
          </div>

          <button
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={darkMode}
            className="theme-toggle"
            onClick={() => {
              const nextMode = !darkMode;
              const nextTheme = nextMode ? "dark" : "light";

              setDarkMode(nextMode);
              document.documentElement.dataset.theme = nextTheme;
              window.localStorage.setItem("lingo-path-theme", nextTheme);
            }}
            type="button"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <section
        className="learner-stats-bar"
        id="learner-stats"
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
        <div className="sidebar-stat mock-gem-stat" aria-label="39 gems (mock balance)">
          <span>💎 Gems</span>
          <strong>39</strong>
        </div>
      </section>

      {lesson ? (
          <section className="course-header" id="lesson">
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
            <div className="celebration-backdrop">
              <section className="celebration-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-complete-title">
                <span className="celebration-icon" aria-hidden="true">🎉</span>
                <p className="eyebrow">LESSON COMPLETE</p>
                <h1 id="lesson-complete-title">Great work!</h1>
                <p>{xpEarned > 0 ? `You earned ${xpEarned} XP.` : "This lesson’s XP reward was already earned."}</p>
                <button className="primary-action" onClick={() => { setLesson(null); setLessonFinished(false); }} type="button">Return to learning path</button>
              </section>
            </div>
          ) : currentExercise ? (
            <>
              <p className="eyebrow">
                QUESTION {currentExerciseIndex + 1} OF {lesson.exercises.length}
              </p>
              <div className="lesson-progress-wrap">
                <progress aria-label="Lesson progress" max={lesson.exercises.length} value={currentExerciseIndex + (answerFeedback?.correct ? 1 : 0)} />
                <span>{currentExerciseIndex + (answerFeedback?.correct ? 1 : 0)} / {lesson.exercises.length}</span>
              </div>
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
                                previous.filter(
                                  (_, index) => index !== position,
                                ),
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
                          const isSelected =
                            selectedWordIndexes.includes(index);

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

                  {currentSpeechText.trim() && (
                    <button
                      className="lesson-back-button"
                      onClick={() =>
                        speakText(
                          currentSpeechText,
                          path.course.target_language,
                        )
                      }
                      style={{ marginTop: 16 }}
                      type="button"
                    >
                      🔊 Listen to my answer
                    </button>
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
                      className={`feedback-panel ${answerFeedback.correct ? "feedback-correct" : "feedback-incorrect"}`}
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
          <section className="course-header" id="learn">
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
              {path.course.units.map((unit) => {
                const completedSkills = unit.skills.filter((skill) => skill.progress.status === "completed").length;
                return (
                  <article className="unit-card course-unit" key={unit.id}>
                    <header className="unit-banner">
                      <div>
                        <p className="unit-number">SECTION 1 · UNIT {unit.position}</p>
                        <h2>{unit.title}</h2>
                        {unit.description && <p>{unit.description}</p>}
                      </div>
                      <span className="unit-banner-stamp" aria-hidden="true">{String(unit.position).padStart(2, "0")}</span>
                    </header>
                    <div className="unit-subheading">
                      <strong>Learning path</strong>
                      <span>{completedSkills}/{unit.skills.length} skills complete</span>
                    </div>
                    <div className="skills-list skill-path">
                      {unit.skills.map((skill, index) => {
                        const canOpen = skill.progress.status === "available" || skill.progress.status === "completed";
                        const firstLesson = skill.lessons[0];
                        return (
                          <div className={`skill-step ${index % 2 === 0 ? "skill-step-left" : "skill-step-right"}`} key={skill.id}>
                            <button
                              aria-label={`${skill.title}, ${skill.progress.status}, ${skill.progress.crowns} crowns`}
                              className={`skill-card skill-node status-${skill.progress.status}`}
                              disabled={!canOpen || !firstLesson || lessonLoading}
                              onClick={() => { if (firstLesson) openLesson(firstLesson.id); }}
                              type="button"
                            >
                              <span className="skill-icon" aria-hidden="true">
                                {skill.progress.status === "completed" ? "✓" : canOpen ? "★" : "🔒"}
                              </span>
                            </button>
                            {canOpen && <span className="bird-companion"><RandomBird /></span>}
                            <div className="skill-info">
                              <strong>{skill.title}</strong>
                              <span className="skill-progress-copy">{skill.lessons.length} lesson{skill.lessons.length === 1 ? "" : "s"}</span>
                              {firstLesson && <span className="lesson-label">{firstLesson.title} · {firstLesson.xp_reward} XP</span>}
                              <span className="crown-pips" aria-label={`${skill.progress.crowns} of 5 crowns`}>
                                {Array.from({ length: 5 }, (_, crown) => <i className={crown < skill.progress.crowns ? "crown-earned" : ""} key={crown}>★</i>)}
                              </span>
                            </div>
                            <span className="status-label">{skill.progress.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="home-rail" aria-label="Your learning progress">
              <section className="rail-card goal-card">
                <p className="eyebrow">DAILY GOAL</p>
                <h2>{Math.min(profile.today_xp, profile.daily_xp_goal)} <span>/ {profile.daily_xp_goal} XP</span></h2>
                <progress aria-label="Daily XP goal progress" max={profile.daily_xp_goal || 1} value={Math.min(profile.today_xp, profile.daily_xp_goal)} />
                <p>{profile.daily_goal_met ? "Daily goal complete! Come back tomorrow." : "A little practice goes a long way."}</p>
                <div className="rail-stat"><span>Longest streak</span><b>{profile.longest_streak} days</b></div>
              </section>

              <section className="rail-card league-card">
                <div className="league-card-top"><span aria-hidden="true">🏆</span><p className="eyebrow">LEADERBOARDS</p></div>
                <h3>{profile.current_streak > 0 ? "Keep your place this week" : "Your league starts here"}</h3>
                <p>Complete a lesson to climb the weekly leaderboard.</p>
                <a className="rail-link" href="/leaderboards">GO TO LEADERBOARDS <span aria-hidden="true">→</span></a>
              </section>

              <section className="rail-card quest-rail-card" aria-labelledby="daily-quests-title">
                <div className="quests-heading">
                  <div><p className="eyebrow">DAILY QUESTS</p><h3 id="daily-quests-title">A few goals for today</h3></div>
                  <a className="rail-link rail-link-small" href="/quests">VIEW ALL</a>
                </div>
                <div className="quest-list">
                  {dailyQuests.map((quest) => {
                    const progress = quest.progress;
                    const completed = quest.completed;
                    return (
                      <article className={`quest-card${completed ? " quest-complete" : ""}`} key={quest.id}>
                        <span className="quest-icon" aria-hidden="true">{quest.icon}</span>
                        <div className="quest-details">
                          <strong>{quest.title}</strong>
                          <div className="quest-progress-row">
                            <progress max={quest.target} value={progress} aria-label={`${quest.title} progress`} />
                            <span>{progress}/{quest.target}</span>
                          </div>
                        </div>
                        <span className="quest-check" aria-label={completed ? "Completed" : "In progress"}>{completed ? "✓" : "›"}</span>
                      </article>
                    );
                  })}
                </div>
              </section>
              <div className="mascot-nudge"><RandomBird /><p><strong>Ready for one more?</strong><span>Your next lesson is waiting.</span></p></div>
            </aside>
          </div>
        </>
      )}
      {outOfHearts && lesson && (
        <div className="celebration-backdrop" role="presentation">
          <section className="celebration-modal hearts-modal" role="dialog" aria-modal="true" aria-labelledby="out-of-hearts-title">
            <span className="celebration-icon" aria-hidden="true">💔</span>
            <p className="eyebrow">TAKE A QUICK BREAK</p>
            <h1 id="out-of-hearts-title">You’re out of hearts</h1>
            <p>Refill your hearts for free in this demo, or come back after they regenerate.</p>
            {profile.heart_refill_seconds !== null && profile.heart_refill_seconds > 0 && <p className="heart-timer">Next heart in about {Math.ceil(profile.heart_refill_seconds / 60)} minutes</p>}
            {lessonError && <p className="route-error">{lessonError}</p>}
            <button className="primary-action" disabled={refillingHearts} onClick={refillHearts} type="button">{refillingHearts ? "Refilling…" : "Refill hearts"}</button>
            <button className="light-action" onClick={() => { setOutOfHearts(false); setLesson(null); setLessonError(null); }} type="button">Return to learning path</button>
          </section>
        </div>
      )}
    </main>
  );
}
