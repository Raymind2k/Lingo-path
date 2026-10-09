"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrimaryNavigation, { type AppSection } from "./PrimaryNavigation";

type Achievement = { id: string; title: string; description: string; icon: string; unlocked: boolean };
type DailyQuest = { id: string; title: string; icon: string; progress: number; target: number; completed: boolean };
type MonthlyQuest = { title: string; progress: number; target: number; completed: boolean; days_remaining: number };
type Profile = {
  username: string; display_name: string; total_xp: number; current_streak: number;
  longest_streak: number; hearts: number; max_hearts: number; heart_refill_seconds: number | null;
  daily_xp_goal: number; today_xp: number; daily_quests: DailyQuest[];
  monthly_quest: MonthlyQuest; achievements?: Achievement[];
};
type Entry = { rank: number; username: string; display_name: string; total_xp: number; current_streak: number };
type LearningPath = { course: { units: { skills: { title: string; progress: { status: string }; lessons: { id: number; title: string }[] }[] }[] } };
type LeaderboardResponse = { leaderboard?: Entry[] };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const pageTitles: Record<AppSection, string> = { learn: "Learn", practice: "Today’s Review", leaderboards: "Leaderboards", quests: "Quests", shop: "Shop", profile: "Profile", more: "More" };

export default function SectionPage({ section }: { section: Exclude<AppSection, "learn"> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(false);
  const [refilling, setRefilling] = useState(false);

  async function reloadProfile() {
    const response = await fetch(`${API}/profile/demo-learner`);
    if (!response.ok) throw new Error("Profile could not load");
    setProfile(await response.json());
  }

  useEffect(() => {
    const saved = localStorage.getItem("lingo-path-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "light";
    Promise.all([
      fetch(`${API}/profile/demo-learner`).then((r) => { if (!r.ok) throw new Error("Profile could not load"); return r.json(); }),
      fetch(`${API}/leaderboard`).then((r) => r.ok ? r.json() : { leaderboard: [] }),
      fetch(`${API}/path/demo-learner`).then((r) => { if (!r.ok) throw new Error("Learning path could not load"); return r.json(); }),
    ]).then(([p, l, coursePath]) => {
      setProfile(p);
      setEntries((l as LeaderboardResponse).leaderboard ?? []);
      setPath(coursePath);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load learner data."));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("lingo-path-theme", next ? "dark" : "light");
  };
  async function refillHearts() {
    setRefilling(true);
    setNotice("");
    try {
      const response = await fetch(`${API}/profile/demo-learner/refill-hearts`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Could not refill hearts.");
      await reloadProfile();
      setNotice("Hearts refilled. You’re ready to keep learning!");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not refill hearts.");
    } finally {
      setRefilling(false);
    }
  }

  const xp = profile?.today_xp ?? 0;
  const goal = profile?.daily_xp_goal ?? 180;
  const goalProgress = Math.min(100, goal ? xp / goal * 100 : 0);
  const availableLessons = (path?.course.units ?? []).flatMap((unit) => unit.skills)
    .filter((skill) => skill.progress.status !== "locked")
    .flatMap((skill) => skill.lessons.map((lesson) => ({ ...lesson, skill: skill.title })));
  const firstPracticeLesson = availableLessons[0];
  const monthly = profile?.monthly_quest;

  return (
    <main className="section-shell">
      <PrimaryNavigation activePage={section} />
      <header className="section-topbar">
        <Link className="brand" href="/"><span className="brand-mark">L</span>Lingo Path</Link>
        <div className="section-top-actions"><span>{profile?.display_name ?? "Demo Learner"}</span><button className="theme-toggle" onClick={toggleTheme} type="button">{dark ? "☀️ Light" : "🌙 Dark"}</button></div>
      </header>
      <div className="section-stats" aria-label="Learner statistics">
        <span>🇪🇸 Spanish</span><span>🔥 {profile?.current_streak ?? "—"} day streak</span><span>💎 39 gems</span><span>❤️ {profile ? `${profile.hearts}/${profile.max_hearts}` : "—"}</span><span>⚡ {profile?.total_xp ?? "—"} XP</span>
      </div>
      <div className="section-content">
        <section className="section-main-column">
          <h1 className="section-title">{pageTitles[section]}</h1>
          {error && <p className="route-error">{error}. Make sure the backend is running.</p>}
          {notice && <p className="success-notice" role="status">{notice}</p>}

          {section === "practice" && <>
            <article className="feature-panel practice-hero"><div><span className="eyebrow">PERSONALIZED PRACTICE</span><h2>Target Practice</h2><p>Strengthen your Spanish with a lesson from your learning path.</p>{firstPracticeLesson ? <Link className="primary-action" href={`/?lesson_id=${firstPracticeLesson.id}`}>Start practice</Link> : <p>Complete a lesson to unlock practice.</p>}</div><span className="feature-art" aria-hidden="true">🦉</span></article>
            <h2 className="subsection-title">Choose a lesson to review</h2>
            <div className="feature-stack">{availableLessons.map((lesson) => <Link className="feature-row" href={`/?lesson_id=${lesson.id}`} key={lesson.id}>📘 <span><b>{lesson.title}</b><small>{lesson.skill} · Replay for practice</small></span>›</Link>)}</div>
            <h2 className="subsection-title">Conversation</h2><Link className="feature-row" href={firstPracticeLesson ? `/?lesson_id=${firstPracticeLesson.id}` : "/"}>🎧 <span><b>Listening practice</b><small>Listen to lesson phrases using the audio control.</small></span>›</Link>
            <h2 className="subsection-title">Your collections</h2><Link className="feature-row" href={firstPracticeLesson ? `/?lesson_id=${firstPracticeLesson.id}` : "/"}>📝 <span><b>Lesson review and words</b><small>Review vocabulary from your available lessons.</small></span>›</Link>
          </>}

          {section === "leaderboards" && <>
            <article className="feature-panel league-hero"><div className="league-medals">🥉　🥈　🏆　🔒　🔒</div><h2>Bronze League</h2><p>Earn XP in lessons to climb the weekly leaderboard.</p><Link className="primary-action" href="/">Start a lesson</Link></article>
            <h2 className="subsection-title">This week</h2><div className="standings-list">{entries.length ? entries.map((entry) => <article className={`standing-row${entry.username === profile?.username ? " standing-current" : ""}`} key={entry.username}><b className="standing-rank">{entry.rank}</b><span className="standing-avatar">{entry.display_name.slice(0, 1).toUpperCase()}</span><span><b>{entry.display_name}{entry.username === profile?.username ? " (you)" : ""}</b><small>🔥 {entry.current_streak} day streak</small></span><strong>{entry.total_xp} XP</strong></article>) : <p className="muted-copy">Complete a lesson to join this week’s leaderboard.</p>}</div>
          </>}

          {section === "quests" && <>
            <article className="monthly-quest"><span className="month-tag">MONTHLY QUEST</span><h2>{monthly?.title ?? "Complete 20 lessons this month"}</h2><p>{monthly?.days_remaining ?? 0} days remaining</p><div className="monthly-progress"><b>{monthly?.progress ?? 0} / {monthly?.target ?? 20} lessons</b><progress value={monthly?.progress ?? 0} max={monthly?.target || 20} /></div></article>
            <div className="section-heading-row"><h2 className="subsection-title">Daily Quests</h2><span className="quest-reset">RESETS DAILY</span></div>
            <div className="feature-stack">{(profile?.daily_quests ?? []).map((quest) => <article className="quest-page-row" key={quest.id}><span className="quest-big-icon">{quest.icon}</span><span><b>{quest.title}</b><small>{quest.progress} / {quest.target}</small><progress value={quest.progress} max={quest.target || 1} /></span><span className="quest-chest">{quest.completed ? "★" : "🎁"}</span></article>)}</div>
            <h2 className="subsection-title">Monthly Badges</h2><div className="badge-grid"><article className={`badge-card${monthly?.progress && monthly.progress >= 5 ? " badge-unlocked" : ""}`}>🏅<b>Quest Starter</b><small>{Math.min(monthly?.progress ?? 0, 5)} / 5 lessons this month</small></article><article className={`badge-card${monthly?.completed ? " badge-unlocked" : ""}`}>🌟<b>Monthly Master</b><small>{monthly?.progress ?? 0} / {monthly?.target ?? 20} lessons</small></article></div>
          </>}

          {section === "shop" && <>
            <article className="feature-panel shop-hero"><div><span className="eyebrow">LINGO PATH PLUS</span><h2>Make learning a little more rewarding</h2><p>Keep practicing and protect your progress.</p><button className="primary-action" type="button" onClick={() => setNotice("Plus subscriptions are a demo placeholder.")}>Explore Plus</button></div><span className="feature-art" aria-hidden="true">💎</span></article>
            <h2 className="subsection-title">Hearts</h2><article className="shop-item"><span>❤️</span><div><b>Refill hearts</b><small>You have {profile?.hearts ?? 0} of {profile?.max_hearts ?? 5} hearts. Hearts also regenerate every 30 minutes.</small></div><button className="light-action" disabled={refilling || (profile?.hearts ?? 0) >= (profile?.max_hearts ?? 5)} onClick={refillHearts} type="button">{refilling ? "Refilling…" : profile?.hearts === profile?.max_hearts ? "Full" : "Free refill"}</button></article>
            {profile?.heart_refill_seconds !== null && profile?.heart_refill_seconds !== undefined && profile.heart_refill_seconds > 0 && <p className="muted-copy">Next heart in about {Math.ceil(profile.heart_refill_seconds / 60)} minutes.</p>}
            <h2 className="subsection-title">Power-ups</h2><article className="shop-item"><span>🧊</span><div><b>Streak Freeze</b><small>Keep your streak safe for one day.</small></div><button className="light-action" onClick={() => setNotice("Streak Freeze is a demo placeholder.")} type="button">Coming soon</button></article>
          </>}

          {section === "profile" && <>
            <article className="profile-hero"><div className="profile-avatar">{profile?.display_name?.slice(0, 1) ?? "D"}</div><div><h2>{profile?.display_name ?? "Demo Learner"}</h2><p>@{profile?.username ?? "demo-learner"}</p><span>Learning Spanish</span></div></article>
            <h2 className="subsection-title">Statistics</h2><div className="profile-stats-grid"><article><b>🔥 {profile?.current_streak ?? 0}</b><small>Day streak</small></article><article><b>⚡ {profile?.total_xp ?? 0}</b><small>Total XP</small></article><article><b>❤️ {profile?.hearts ?? 0}/{profile?.max_hearts ?? 5}</b><small>Hearts</small></article><article><b>🎯 {xp}/{goal}</b><small>Daily goal XP</small></article><article><b>💎 39</b><small>Mock gems</small></article><article><b>🏅 {monthly?.progress ?? 0}/{monthly?.target ?? 20}</b><small>Monthly quest lessons</small></article></div>
            <h2 className="subsection-title">Achievements</h2><div className="feature-stack">{(profile?.achievements ?? []).map((a) => <article className={`profile-badge${a.unlocked ? " badge-unlocked" : ""}`} key={a.id}><span>{a.icon}</span><span><b>{a.title}</b><small>{a.description}</small></span><small>{a.unlocked ? "Unlocked" : "Locked"}</small></article>)}</div>
          </>}

          {section === "more" && <><p className="muted-copy">Settings and other learning options.</p><div className="more-links-grid">{[{ href: "/", icon: "🏠", label: "Learn" }, { href: "/practice", icon: "🏋️", label: "Practice" }, { href: "/leaderboards", icon: "🏆", label: "Leaderboards" }, { href: "/quests", icon: "🧰", label: "Quests" }, { href: "/shop", icon: "🏪", label: "Shop" }, { href: "/profile", icon: "👤", label: "Profile" }].map((item) => <Link className="more-link-card" href={item.href} key={item.href}>{item.icon}<b>{item.label}</b><span>Open page →</span></Link>)}</div><section className="settings-card" id="settings"><h2>Settings</h2><p>Choose your preferred appearance.</p><button className="light-action" onClick={toggleTheme} type="button">{dark ? "Switch to light mode" : "Switch to dark mode"}</button></section></>}
        </section>
        <aside className="section-rail"><article className="rail-card"><p className="eyebrow">DAILY GOAL</p><h2>{xp} / {goal} XP</h2><progress value={goalProgress} max="100"/><p>{goalProgress >= 100 ? "Daily goal complete!" : "Keep your progress going."}</p><div className="rail-stat"><span>Longest streak</span><b>{profile?.longest_streak ?? 0} days</b></div><div className="rail-stat"><span>Course units</span><b>{path?.course.units.length ?? 0}</b></div></article><article className="rail-card"><p className="eyebrow">KEEP LEARNING</p><h2>One lesson at a time</h2><p>Continue your path and earn XP.</p><Link className="primary-action" href="/">Go to Learn</Link></article></aside>
      </div>
    </main>
  );
}
