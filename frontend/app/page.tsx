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

function RandomBird({ motionClass = "" }: { motionClass?: string }) {
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
    <span className="duo-bird-scale">
      <span className={`duo-bird ${motionClass}`} aria-label="Duo the owl">
        <span className="duo-bird-body">
          <span className="duo-bird-wing" />
          <span className="duo-bird-feet"><i /><i /></span>
        </span>
        <span className={`duo-bird-head pose-${pose}`}>
          <span className="duo-bird-eyes">
            <i />
            <i />
          </span>
          <span className="duo-bird-beak" />
        </span>
      </span>
    </span>
  );
}

type MascotPlacement = { x: number; y: number; size: "small" | "medium" | "large" };

function getUnitMascotPlacements(unitId: number, position: number, skillCount: number, hasTopic: boolean): MascotPlacement[] {
  const artPosition = ((position - 1) % 5 + 5) % 5 + 1;
  const counts = [1, 2, 1, 2, 1];
  const count = counts[artPosition - 1];
  let seed = (Math.abs(unitId) * 48271 + artPosition * 16807) % 2147483647 || 1;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  // When a unit has two characters, put them in separate vertical bands so their idle loops never collide.
  const firstY = count === 2
    ? (random() < 0.5 ? 20 + random() * 5 : 75 + random() * 5)
    : 18 + random() * 64;
  const sizes: MascotPlacement["size"][] = ["small", "medium", "large"];
  const firstSizeIndex = (Math.abs(unitId * 7 + artPosition * 11) + Math.floor(random() * 3)) % sizes.length;
  const getNodeSide = (y: number): "left" | "right" => {
    const steps = Math.max(skillCount, 1);
    const rowPosition = hasTopic
      ? -0.42 + (y / 100) * (steps + 0.28)
      : 0.03 + (y / 100) * (steps - 0.17);
    const row = Math.max(0, Math.min(steps - 1, Math.round(rowPosition)));
    return row % 2 === 0 ? "left" : "right";
  };
  const makePlacement = (y: number, size: MascotPlacement["size"]): MascotPlacement => {
    const side = getNodeSide(y);
    const edge = size === "large" ? 14 : size === "medium" ? 12 : 10;
    const x = edge + random() * 2;
    return {
      // Keep each mascot in the same outside gutter as its nearest node, away from that row's text column.
      x: side === "left" ? x : 100 - x,
      y,
      size,
    };
  };
  const placements = [makePlacement(firstY, sizes[firstSizeIndex])];

  if (count === 2) {
    const secondY = firstY < 50 ? 75 + random() * 5 : 20 + random() * 5;
    const secondSize = sizes[(firstSizeIndex + 2) % sizes.length];
    placements.push(makePlacement(secondY, secondSize));
  }

  return placements;
}

function UnitMascotArtwork({ position }: { position: number }) {
  return (
    <>
      {position === 1 ? <RandomBird motionClass="unit-one-dance" /> : null}
      {position === 2 ? (
        <svg className="unit-mascot-art" viewBox="0 0 120 100" aria-hidden="true">
          <ellipse cx="60" cy="91" rx="31" ry="7" fill="#34474e" />
          <g className="thinker-character">
            <path d="M37 75c2-14 11-21 25-21s23 7 25 21l-3 9H40z" fill="#6641a5" />
            <path d="M47 78c-7 3-13 8-13 13h24l3-13m12 0 8 13h19c-2-9-9-14-19-16" fill="#493174" />
            <path d="M39 67c-9-5-12-12-8-17 4-4 10 0 16 6l8 8-7 9z" fill="#9b68f2" />
            <circle cx="63" cy="37" r="22" fill="#ffc49e" />
            <path d="M41 38c-4-18 8-32 24-31 18 1 27 15 21 32-6-2-12-7-16-14-5 10-17 15-29 13z" fill="#913df2" />
            <path d="M43 38c-5 8-7 17-4 25 5-5 9-9 13-14z" fill="#b778ff" />
            <ellipse cx="57" cy="41" rx="2" ry="3" fill="#26343a" />
            <ellipse cx="72" cy="41" rx="2" ry="3" fill="#26343a" />
            <path d="M60 51q6 5 12 0" fill="none" stroke="#a34b65" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M82 34c5-7 9-8 12-4" fill="none" stroke="#ffc49e" strokeWidth="6" strokeLinecap="round" />
            <circle cx="96" cy="28" r="5" fill="#ffc49e" />
          </g>
        </svg>
      ) : null}
      {position === 3 ? (
        <svg className="unit-mascot-art" viewBox="0 0 140 105" aria-hidden="true">
          <ellipse cx="65" cy="94" rx="35" ry="7" fill="#34474e" />
          <g className="pollinator-character">
            <path d="M45 57q19-12 38 0l10 31H38z" fill="#21cfa1" />
            <path d="M47 76 36 91h17l11-14m18-1 11 15h17L91 71" fill="#148ec0" />
            <circle cx="66" cy="35" r="20" fill="#e9a082" />
            <path d="M46 34q0-26 22-25 20 1 20 23l-12-8-7-9-7 10z" fill="#37353a" />
            <path d="M48 52q17 7 34-2l9 31H40z" fill="#f49acc" />
            <path d="M48 57 35 70m38-12 12-13" fill="none" stroke="#e9a082" strokeWidth="8" strokeLinecap="round" />
            <circle cx="60" cy="37" r="2" fill="#26343a" />
            <circle cx="74" cy="37" r="2" fill="#26343a" />
            <path d="M62 45q5 4 10 0" fill="none" stroke="#9b4c55" strokeWidth="2" strokeLinecap="round" />
            <path d="M82 43q12-13 20-12" fill="none" stroke="#5cae2b" strokeWidth="3" />
            <path d="M100 31q-5-9 2-12 5 7 0 12m0 0q10-6 13 2-7 4-13-2m0 0q1 11-7 12-3-7 7-12" fill="#ffdf21" />
          </g>
          <g className="mascot-bee bee-one"><ellipse cx="22" cy="34" rx="8" ry="5" fill="#ffd928" /><path d="M18 30v9m6-9v9" stroke="#423b23" strokeWidth="2" /><ellipse cx="18" cy="27" rx="4" ry="3" fill="#d7f6ff" /><ellipse cx="26" cy="27" rx="4" ry="3" fill="#d7f6ff" /></g>
          <g className="mascot-bee bee-two"><ellipse cx="116" cy="57" rx="8" ry="5" fill="#ffd928" /><path d="M112 53v9m6-9v9" stroke="#423b23" strokeWidth="2" /><ellipse cx="112" cy="50" rx="4" ry="3" fill="#d7f6ff" /><ellipse cx="120" cy="50" rx="4" ry="3" fill="#d7f6ff" /></g>
        </svg>
      ) : null}
      {position === 4 ? (
        <svg className="unit-mascot-art" viewBox="0 0 130 105" aria-hidden="true">
          <ellipse cx="61" cy="94" rx="34" ry="7" fill="#34474e" />
          <g className="fox-explorer">
            <path d="m41 30-6-23 23 14m15 0L94 7l-6 27" fill="#f28a35" stroke="#c85b24" strokeWidth="3" strokeLinejoin="round" />
            <ellipse cx="65" cy="39" rx="29" ry="27" fill="#f28a35" />
            <path d="M43 47q22-19 44 0-5 19-22 20-17-1-22-20" fill="#fff1ce" />
            <ellipse cx="55" cy="38" rx="3" ry="5" fill="#29333a" /><ellipse cx="75" cy="38" rx="3" ry="5" fill="#29333a" />
            <path d="m62 48 4 3 4-3" fill="#713b2e" />
            <path d="M45 65q20-10 40 0l10 23H38z" fill="#258ed0" />
            <path d="M45 80 36 93h19l9-13m15 0 10 13h19L91 77" fill="#344c82" />
            <path d="M45 68 33 79m46-11 9-8" fill="none" stroke="#f28a35" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g className="explorer-glass"><circle cx="99" cy="61" r="12" fill="#93e7f2" fillOpacity=".65" stroke="#ffe04a" strokeWidth="5" /><path d="m108 70 11 12" stroke="#b77935" strokeWidth="6" strokeLinecap="round" /></g>
        </svg>
      ) : null}
      {position === 5 ? (
        <svg className="unit-mascot-art" viewBox="0 0 130 110" aria-hidden="true">
          <ellipse cx="59" cy="101" rx="35" ry="6" fill="#34474e" />
          <g className="pink-dancer">
            <path d="M38 37c-2-20 10-33 29-33s33 13 30 34c-1 8-7 14-14 17H48c-7-4-10-10-10-18" fill="#ff9bd3" />
            <ellipse cx="66" cy="39" rx="20" ry="22" fill="#f3b18e" />
            <path d="M48 31q3-18 20-18 13 0 18 14-10-4-17-12-8 13-21 16" fill="#292d39" />
            <ellipse cx="60" cy="40" rx="2" ry="3" fill="#28333a" /><ellipse cx="73" cy="40" rx="2" ry="3" fill="#28333a" />
            <path d="M61 49q5 3 10-1" fill="none" stroke="#9a4b5f" strokeWidth="2" strokeLinecap="round" />
            <path d="M48 59q18 8 36 0l12 24-20 9H48L37 78z" fill="#ee68b7" />
            <path d="m49 83-10 13h18l9-13m12 2 11 11h17L94 78" fill="#ffb5dd" />
            <path d="m48 62-12 15m44-15 15 7" fill="none" stroke="#f3b18e" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g className="dance-ball"><circle cx="104" cy="69" r="12" fill="#a05cff" /><path d="M94 67q10-8 20 0m-11-10q8 12 0 24" fill="none" stroke="#d8b7ff" strokeWidth="3" /></g>
        </svg>
      ) : null}
    </>
  );
}

function UnitMascot({ position, unitId, skillCount, hasTopic }: { position: number; unitId: number; skillCount: number; hasTopic: boolean }) {
  const artPosition = ((position - 1) % 5 + 5) % 5 + 1;
  const placements = getUnitMascotPlacements(unitId, artPosition, skillCount, hasTopic);
  const labels: Record<number, string> = {
    1: "Duo doing a dance",
    2: "A purple-haired learner thinking",
    3: "A gardener with buzzing bees",
    4: "An orange fox explorer with a magnifying glass",
    5: "A pink-hooded dancer holding a ball",
  };

  return (
    <div
      className={`unit-mascot unit-mascot-${artPosition}`}
      role="img"
      aria-label={`Unit ${position} learning characters: ${labels[artPosition] ?? "friendly mascots"}`}
    >
      {placements.map((placement, index) => {
        const characterPosition = index === 0 ? artPosition : artPosition % 5 + 1;
        return (
          <span
            className={`unit-mascot-character unit-character-${characterPosition} ${index === 0 ? "mascot-primary" : "mascot-secondary"} mascot-size-${placement.size}`}
            key={`${unitId}-${index}`}
            style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
            aria-hidden="true"
          >
            <UnitMascotArtwork position={characterPosition} />
          </span>
        );
      })}
    </div>
  );
}

function getExerciseLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: "NEW WORD",
    translate: "TRANSLATE",
    word_bank: "BUILD THE SENTENCE",
    fill_blank: "COMPLETE THE WORD",
    matching: "MATCH PAIRS",
  };
  return labels[type] ?? type.replaceAll("_", " ").toUpperCase();
}

function getChoiceIllustration(choice: string): string {
  const value = choice.toLocaleLowerCase();
  if (/panader|bakery|bread|pan$/.test(value)) return "🥐";
  if (/francia|france|francés/.test(value)) return "🇫🇷";
  if (/méxico|mexico/.test(value)) return "🇲🇽";
  if (/me llamo|my name|ana/.test(value)) return "🧑‍🎓";
  if (/hola|hello|buenos|greet/.test(value)) return "👋";
  if (/hasta luego|adiós|goodbye/.test(value)) return "👋";
  if (/por favor|please/.test(value)) return "🙏";
  if (/gracias|thank/.test(value)) return "💛";
  if (/café|cafe|coffee/.test(value)) return "☕";
  if (/agua|water/.test(value)) return "💧";
  if (/libro|book/.test(value)) return "📚";
  if (/familia|family/.test(value)) return "👨‍👩‍👧";
  return "✨";
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
  const [gems, setGems] = useState(39);
  const [claimedChests, setClaimedChests] = useState<Record<number, boolean>>({});
  const [chestMessage, setChestMessage] = useState<string | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<number | null>(null);

  const [selectedChoice, setSelectedChoice] = useState("");
  const [selectedWordIndexes, setSelectedWordIndexes] = useState<number[]>([]);
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, string>
  >({});
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerFeedback, setAnswerFeedback] =
    useState<AnswerFeedback | null>(null);
  const [lessonReaction, setLessonReaction] = useState<string | null>(null);

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
    if (!path || lesson) return;

    const dividers = Array.from(
      document.querySelectorAll<HTMLElement>(".unit-topic-divider[data-unit-id]"),
    );
    if (dividers.length === 0) return;

    let frame = 0;
    const updateActiveUnit = () => {
      frame = 0;
      const banner = document.querySelector<HTMLElement>(".active-unit-banner");
      const handoffLine = (banner?.getBoundingClientRect().height ?? 0) + 14;
      let activeDivider = dividers[0];

      for (const divider of dividers) {
        if (divider.getBoundingClientRect().top <= handoffLine) {
          activeDivider = divider;
        } else {
          break;
        }
      }

      const nextUnitId = Number(activeDivider.dataset.unitId);
      if (Number.isFinite(nextUnitId)) {
        setActiveUnitId((currentUnitId) => currentUnitId === nextUnitId ? currentUnitId : nextUnitId);
      }
    };
    const scheduleUpdate = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updateActiveUnit);
    };

    updateActiveUnit();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [path?.course.units, lesson]);

  useEffect(() => {
    try {
      const storedGems = Number(window.localStorage.getItem("lingo-path-gems"));
      if (Number.isFinite(storedGems) && storedGems >= 39) setGems(storedGems);
      const storedChests = window.localStorage.getItem("lingo-path-chests");
      if (storedChests) setClaimedChests(JSON.parse(storedChests) as Record<number, boolean>);
    } catch {
      // A malformed local demo save should not stop the learning path from loading.
    }
  }, []);

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

  function openUnitChest(unitId: number, unitTitle: string) {
    const unit = path?.course.units.find((item) => item.id === unitId);
    if (!unit || unit.skills.some((skill) => skill.progress.status !== "completed") || claimedChests[unitId]) return;
    const nextClaims = { ...claimedChests, [unitId]: true };
    const nextGems = gems + 50;
    setClaimedChests(nextClaims);
    setGems(nextGems);
    setChestMessage(`${unitTitle} chest opened! You collected 50 gems.`);
    window.localStorage.setItem("lingo-path-chests", JSON.stringify(nextClaims));
    window.localStorage.setItem("lingo-path-gems", String(nextGems));
  }

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
    setLessonReaction(null);
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
  const canCheckAnswer = currentExercise?.exercise_type === "word_bank"
    ? selectedWordIndexes.length > 0
    : currentExercise?.exercise_type === "matching"
      ? currentPairs.length > 0 && currentPairs.every((pair) => Boolean(matchingAnswers[pair.left]))
      : currentChoices.length > 0
        ? Boolean(selectedChoice)
        : Boolean(typedAnswer.trim());
  const dailyQuests = profile.daily_quests ?? [];
  const firstUnit = path.course.units[0] ?? null;
  const firstUnitCompletedSkills = firstUnit?.skills.filter((skill) => skill.progress.status === "completed").length ?? 0;
  const activeUnit = path.course.units.find((unit) => unit.id === activeUnitId) ?? firstUnit;

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
        <div className="sidebar-stat mock-gem-stat" aria-label={`${gems} gems (mock balance)`}>
          <span>💎 Gems</span>
          <strong>{gems}</strong>
        </div>
      </section>

      {lesson ? (
        <section className="lesson-screen" id="lesson">
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
              <header className="lesson-topbar">
                <button
                  aria-label="Exit lesson and return to learning path"
                  className="lesson-close-button"
                  onClick={() => { setLesson(null); setLessonError(null); setLessonFinished(false); }}
                  type="button"
                >
                  ×
                </button>
                <div className="lesson-progress-wrap">
                  <progress aria-label="Lesson progress" max={lesson.exercises.length} value={currentExerciseIndex + (answerFeedback?.correct ? 1 : 0)} />
                  <span className="lesson-progress-count">{currentExerciseIndex + (answerFeedback?.correct ? 1 : 0)}/{lesson.exercises.length}</span>
                </div>
                <span className="lesson-heart-count" aria-label={`${profile.hearts} hearts remaining`}><span aria-hidden="true">❤️</span> {profile.hearts}</span>
              </header>

              <main className="lesson-stage">
                <div className="lesson-question">
                  <p className="lesson-context">{lesson.title}</p>
                  <p className="eyebrow lesson-exercise-type">{getExerciseLabel(currentExercise.exercise_type)}</p>
                  <h1>{currentExercise.prompt}</h1>
                </div>

                {lessonError && (
                  <section className="message-card error-card lesson-inline-error" role="alert">
                    <p>{lessonError}</p>
                  </section>
                )}

                <div className="lesson-exercises">
                  <article className={`exercise-card exercise-${currentExercise.exercise_type}`}>
                    {currentExercise.exercise_type === "word_bank" ? (
                      <>
                        <p className="exercise-instruction">Tap the words in order. Tap a word above to remove it.</p>
                        <div aria-label="Your answer" className="exercise-choices exercise-answer-bank">
                          {selectedWordIndexes.map((wordIndex, position) => (
                            <button
                              className="exercise-choice word-chip word-chip-selected"
                              disabled={Boolean(answerFeedback) || submitting}
                              key={`${wordIndex}-${position}`}
                              onClick={() => setSelectedWordIndexes((previous) => previous.filter((_, index) => index !== position))}
                              type="button"
                            >
                              {currentWords[wordIndex]}
                            </button>
                          ))}
                        </div>
                        <div className="exercise-choices word-bank" aria-label="Word bank">
                          {currentWords.map((word, index) => {
                            const isSelected = selectedWordIndexes.includes(index);
                            return (
                              <button
                                className="exercise-choice word-chip"
                                disabled={isSelected || Boolean(answerFeedback) || submitting}
                                key={`${word}-${index}`}
                                onClick={() => setSelectedWordIndexes((previous) => [...previous, index])}
                                type="button"
                              >
                                {word}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : currentExercise.exercise_type === "matching" ? (
                      <div className="matching-list">
                        {currentPairs.map((pair) => (
                          <label className="matching-row" key={pair.left}>
                            <span>{pair.left}</span>
                            <select
                              className="exercise-input"
                              disabled={Boolean(answerFeedback) || submitting}
                              onChange={(event) => setMatchingAnswers((previous) => ({ ...previous, [pair.left]: event.target.value }))}
                              value={matchingAnswers[pair.left] ?? ""}
                            >
                              <option value="">Choose a match</option>
                              {currentMatchingOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    ) : currentChoices.length > 0 ? (
                      <div className="exercise-choices exercise-choice-grid">
                        {currentChoices.map((choice, index) => {
                          const selected = selectedChoice === choice;
                          const isCorrectChoice = Boolean(answerFeedback && choice === answerFeedback.correct_answer);
                          const isIncorrectChoice = Boolean(answerFeedback && selected && !answerFeedback.correct);
                          return (
                            <button
                              aria-pressed={selected}
                              className={`exercise-choice choice-card${selected ? " exercise-choice-selected" : ""}${isCorrectChoice ? " exercise-choice-correct" : ""}${isIncorrectChoice ? " exercise-choice-incorrect" : ""}`}
                              disabled={Boolean(answerFeedback) || submitting}
                              key={choice}
                              onClick={() => setSelectedChoice(choice)}
                              type="button"
                            >
                              <span className="exercise-choice-art" aria-hidden="true">{getChoiceIllustration(choice)}</span>
                              <span className="exercise-choice-copy">
                                <span>{choice}</span>
                                <kbd>{index + 1}</kbd>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <label className="typed-answer-wrap">
                        <span>Your answer</span>
                        <input
                          aria-label="Type your answer"
                          className="exercise-input"
                          disabled={Boolean(answerFeedback) || submitting}
                          onChange={(event) => setTypedAnswer(event.target.value)}
                          onKeyDown={(event) => { if (event.key === "Enter" && canCheckAnswer && !submitting) void submitAnswer(); }}
                          placeholder="Type your answer"
                          value={typedAnswer}
                        />
                      </label>
                    )}

                    {currentSpeechText.trim() && (
                      <button className="lesson-audio-button" onClick={() => speakText(currentSpeechText, path.course.target_language)} type="button">
                        🔊 Listen to my answer
                      </button>
                    )}
                  </article>
                </div>
              </main>

              {answerFeedback ? (
                <div className={`lesson-response ${answerFeedback.correct ? "lesson-response-correct" : "lesson-response-incorrect"}`} aria-live="polite" aria-atomic="true">
                  <div className="lesson-response-inner">
                    <div className="lesson-response-copy">
                      <span className="lesson-response-mark" aria-hidden="true">{answerFeedback.correct ? "✓" : "✕"}</span>
                      <div className="lesson-response-body">
                        <strong>{answerFeedback.correct ? "Awesome!" : answerFeedback.feedback}</strong>
                        {!answerFeedback.correct && answerFeedback.correct_answer && <p>Correct answer: <b>{answerFeedback.correct_answer}</b></p>}
                        {!answerFeedback.correct && answerFeedback.explanation && <p>{answerFeedback.explanation}</p>}
                        {answerFeedback.correct && (
                          <div className="lesson-response-feedback">
                            <div className="lesson-response-reactions" aria-label="Rate this question">
                              <button aria-pressed={lessonReaction === "easy"} className={lessonReaction === "easy" ? "reaction-selected" : ""} onClick={() => setLessonReaction("easy")} type="button">TOO EASY</button>
                              <button aria-pressed={lessonReaction === "difficult"} className={lessonReaction === "difficult" ? "reaction-selected" : ""} onClick={() => setLessonReaction("difficult")} type="button">TOO DIFFICULT</button>
                              <button aria-pressed={lessonReaction === "report"} className={lessonReaction === "report" ? "reaction-selected" : ""} onClick={() => setLessonReaction("report")} type="button">REPORT</button>
                            </div>
                            {lessonReaction && <p className="lesson-response-note" aria-live="polite">Feedback noted for this session.</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className={`lesson-response-action ${answerFeedback.correct ? "response-action-correct" : "response-action-retry"}`}
                      onClick={answerFeedback.correct ? continueToNextQuestion : clearCurrentAnswer}
                      type="button"
                    >
                      {answerFeedback.correct ? "CONTINUE" : "TRY AGAIN"}
                    </button>
                  </div>
                </div>
              ) : (
                <footer className="lesson-footer">
                  <div className="lesson-footer-inner">
                    <span className="lesson-footer-hint">Choose the best answer to continue</span>
                    <button className="lesson-check-button" disabled={!canCheckAnswer || submitting} onClick={submitAnswer} type="button">
                      {submitting ? "CHECKING…" : "CHECK"}
                    </button>
                  </div>
                </footer>
              )}
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
              {firstUnit && (
                <div className="unit-subheading first-unit-topic">
                  <div className="unit-topic-divider" data-unit-id={firstUnit.id} aria-label={`Unit topic: ${firstUnit.title}`}>
                    <span>{firstUnit.description ?? firstUnit.title}</span>
                  </div>
                  <span className="unit-progress-copy">{firstUnitCompletedSkills}/{firstUnit.skills.length} skills complete</span>
                </div>
              )}
              {activeUnit && (
                <header
                  className={`unit-banner active-unit-banner course-unit-theme-${((activeUnit.position - 1) % 5) + 1}`}
                  aria-live="polite"
                  aria-label={`Section 1, unit ${activeUnit.position}: ${activeUnit.title}`}
                >
                  <div>
                    <p className="unit-number">SECTION 1 · UNIT {activeUnit.position}</p>
                    <h2>{activeUnit.title}</h2>
                    {activeUnit.description && <p>{activeUnit.description}</p>}
                  </div>
                  <span className="unit-banner-stamp" aria-hidden="true">{String(activeUnit.position).padStart(2, "0")}</span>
                </header>
              )}
              {path.course.units.map((unit, unitIndex) => {
                const completedSkills = unit.skills.filter((skill) => skill.progress.status === "completed").length;
                return (
                  <article className={`unit-card course-unit course-unit-theme-${((unit.position - 1) % 5) + 1}`} key={unit.id}>
                    {unitIndex > 0 && (
                      <div className="unit-subheading">
                        <div className="unit-topic-divider" data-unit-id={unit.id} aria-label={`Unit topic: ${unit.title}`}>
                          <span>{unit.description ?? unit.title}</span>
                        </div>
                        <span className="unit-progress-copy">{completedSkills}/{unit.skills.length} skills complete</span>
                      </div>
                    )}
                    <UnitMascot position={unit.position} unitId={unit.id} skillCount={unit.skills.length} hasTopic={unitIndex > 0} />
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
                                {skill.progress.status === "completed" ? "★" : canOpen ? "★" : "🔒"}
                              </span>
                            </button>
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
                      <div className="unit-chest-wrap">
                        <button
                          className={`unit-chest${completedSkills === unit.skills.length ? " chest-ready" : ""}${claimedChests[unit.id] ? " chest-claimed" : ""}`}
                          disabled={completedSkills !== unit.skills.length || Boolean(claimedChests[unit.id])}
                          onClick={() => openUnitChest(unit.id, unit.title)}
                          type="button"
                        >
                          <span className="unit-chest-icon" aria-hidden="true">
                            <svg viewBox="0 0 48 48" focusable="false">
                              <path d="M7 19h34v23H7z" fill="#b66a00" />
                              <path d="M4 11h40v12H4z" fill="#ffe02f" />
                              <path d="M8 24h32v13H8z" fill="#e9a900" />
                              <path d="M20 20h8v12h-8z" rx="2" fill="#8a4c00" />
                              <circle cx="24" cy="25" r="2" fill="#ffe02f" />
                              <path d="M22 26h4v4h-4z" fill="#ffe02f" />
                            </svg>
                          </span>
                          <span><strong>{claimedChests[unit.id] ? "Chest opened" : "Unit reward chest"}</strong><small>{claimedChests[unit.id] ? "50 gems collected" : completedSkills === unit.skills.length ? "Open to collect 50 gems" : `${completedSkills}/${unit.skills.length} skills complete`}</small></span>
                          <span className="chest-gem">💎</span>
                        </button>
                      </div>
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
                        <span className="quest-check" aria-label={completed ? "Completed" : "In progress"}>{completed ? "★" : "›"}</span>
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
      {chestMessage && (
        <div className="celebration-backdrop" role="presentation">
          <section className="celebration-modal" role="dialog" aria-modal="true" aria-labelledby="chest-reward-title">
            <span className="celebration-icon" aria-hidden="true">🎁</span>
            <p className="eyebrow">UNIT REWARD</p>
            <h1 id="chest-reward-title">Treasure time!</h1>
            <p>{chestMessage}</p>
            <button className="primary-action" onClick={() => setChestMessage(null)} type="button">Continue learning</button>
          </section>
        </div>
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
