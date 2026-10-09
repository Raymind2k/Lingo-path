"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrimaryNavigation, { type AppSection } from "./PrimaryNavigation";

type Achievement = { id: string; title: string; description: string; icon: string; unlocked: boolean };
type Profile = { username: string; display_name: string; total_xp: number; current_streak: number; longest_streak: number; hearts: number; max_hearts: number; daily_xp_goal: number; today_xp: number; achievements?: Achievement[] };
type Entry = { rank: number; username: string; display_name: string; total_xp: number; current_streak: number };
type PageData = { leaderboard?: Entry[] };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const title: Record<AppSection, string> = { learn: "Learn", practice: "Today's Review", leaderboards: "Leaderboards", quests: "Quests", shop: "Shop", profile: "Profile", more: "More" };

export default function SectionPage({ section }: { section: Exclude<AppSection, "learn"> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lingo-path-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "light";
    Promise.all([
      fetch(`${API}/profile/demo-learner`).then((r) => { if (!r.ok) throw new Error("Profile could not load"); return r.json(); }),
      fetch(`${API}/leaderboard`).then((r) => r.ok ? r.json() : { leaderboard: [] }),
    ]).then(([p, l]) => { setProfile(p); setEntries((l as PageData).leaderboard ?? []); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load learner data."));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("lingo-path-theme", next ? "dark" : "light");
  };
  const xp = profile?.today_xp ?? 0;
  const goal = profile?.daily_xp_goal ?? 20;
  const progress = Math.min(100, goal ? (xp / goal) * 100 : 0);

  return (
    <main className="section-shell">
      <PrimaryNavigation activePage={section} />
      <header className="section-topbar">
        <Link className="brand" href="/"><span className="brand-mark">L</span>Lingo Path</Link>
        <div className="section-top-actions"><span>{profile?.display_name ?? "Demo Learner"}</span><button className="theme-toggle" onClick={toggleTheme} type="button">{dark ? "☀️ Light" : "🌙 Dark"}</button></div>
      </header>
      <div className="section-stats" aria-label="Learner statistics">
        <span>❤️ {profile ? `${profile.hearts}/${profile.max_hearts}` : "—"}</span><span>⚡ {profile?.total_xp ?? "—"} XP</span><span>🔥 {profile?.current_streak ?? "—"} day streak</span>
      </div>
      <div className="section-content">
        <section className="section-main-column">
          <h1 className="section-title">{title[section]}</h1>
          {error && <p className="route-error">{error}. Make sure the backend is running.</p>}
          {section === "practice" && <>
            <article className="feature-panel practice-hero"><div><span className="eyebrow">PERSONALIZED PRACTICE</span><h2>Target Practice</h2><p>Strengthen your Spanish with a quick review session.</p><Link className="primary-action" href="/">Start learning</Link></div><span className="feature-art" aria-hidden="true">🦉</span></article>
            <h2 className="subsection-title">Conversation</h2><Link className="feature-row" href="/">🎧 <span><b>Listening practice</b><small>Build your listening skills with short exercises.</small></span>›</Link>
            <h2 className="subsection-title">Your collections</h2><div className="feature-stack"><Link className="feature-row" href="/">📝 <span><b>Lesson review</b><small>Review vocabulary from your learning path.</small></span>›</Link><Link className="feature-row" href="/">📚 <span><b>Words</b><small>Practice the words you have learned.</small></span>›</Link></div>
          </>}
          {section === "leaderboards" && <>
            <article className="feature-panel league-hero"><div className="league-medals">🥉　🥈　🏆　🔒　🔒</div><h2>Bronze League</h2><p>Earn XP in lessons to climb the weekly leaderboard.</p><Link className="primary-action" href="/">Start a lesson</Link></article>
            <h2 className="subsection-title">This week</h2><div className="standings-list">{entries.length ? entries.map((entry) => <article className={`standing-row${entry.username === profile?.username ? " standing-current" : ""}`} key={entry.username}><b className="standing-rank">{entry.rank}</b><span className="standing-avatar">{entry.display_name.slice(0, 1).toUpperCase()}</span><span><b>{entry.display_name}{entry.username === profile?.username ? " (you)" : ""}</b><small>🔥 {entry.current_streak} day streak</small></span><strong>{entry.total_xp} XP</strong></article>) : <p className="muted-copy">Complete a lesson to join this week’s leaderboard.</p>}</div>
          </>}
          {section === "quests" && <>
            <article className="monthly-quest"><span className="month-tag">OCTOBER QUEST</span><h2>Monthly Quest</h2><p>Complete learning goals and earn a badge.</p><div className="monthly-progress"><b>{Math.min(xp, 100)} / 100 XP</b><progress value={Math.min(xp, 100)} max="100" /></div></article>
            <div className="section-heading-row"><h2 className="subsection-title">Daily Quests</h2><span className="quest-reset">RESETS DAILY</span></div>
            <div className="feature-stack">{[{ icon: "⚡", name: "Earn 10 XP", value: xp, max: 10 }, { icon: "🦉", name: "Reach your daily goal", value: xp, max: goal }, { icon: "🎧", name: "Complete a lesson", value: xp > 0 ? 1 : 0, max: 1 }].map((q) => <article className="quest-page-row" key={q.name}><span className="quest-big-icon">{q.icon}</span><span><b>{q.name}</b><small>{Math.min(q.value, q.max)} / {q.max}</small><progress value={Math.min(q.value, q.max)} max={q.max || 1} /></span><span className="quest-chest">🎁</span></article>)}</div>
            <h2 className="subsection-title">Monthly Badges</h2><div className="badge-grid"><article className="badge-card">🏅<b>Quest Starter</b><small>Complete 5 quests</small></article><article className="badge-card">🌟<b>Monthly Master</b><small>Complete 20 quests</small></article></div>
          </>}
          {section === "shop" && <>
            <article className="feature-panel shop-hero"><div><span className="eyebrow">LINGO PATH PLUS</span><h2>Make learning a little more rewarding</h2><p>Keep practicing and protect your progress.</p><button className="primary-action" type="button" onClick={() => alert("Plus trial is not configured yet.")}>Explore Plus</button></div><span className="feature-art" aria-hidden="true">💎</span></article>
            <h2 className="subsection-title">Hearts</h2><article className="shop-item"><span>❤️</span><div><b>Refill hearts</b><small>You have {profile?.hearts ?? 0} of {profile?.max_hearts ?? 5} hearts.</small></div><button className="light-action" type="button" onClick={() => alert("Heart refills are not configured yet.")}>Refill</button></article>
            <h2 className="subsection-title">Power-ups</h2><article className="shop-item"><span>🧊</span><div><b>Streak Freeze</b><small>Keep your streak safe for one day.</small></div><button className="light-action" type="button" onClick={() => alert("Power-ups are not configured yet.")}>Coming soon</button></article>
          </>}
          {section === "profile" && <>
            <article className="profile-hero"><div className="profile-avatar">{profile?.display_name?.slice(0, 1) ?? "D"}</div><div><h2>{profile?.display_name ?? "Demo Learner"}</h2><p>@{profile?.username ?? "demo-learner"}</p><span>Learning Spanish</span></div></article>
            <h2 className="subsection-title">Statistics</h2><div className="profile-stats-grid"><article><b>🔥 {profile?.current_streak ?? 0}</b><small>Day streak</small></article><article><b>⚡ {profile?.total_xp ?? 0}</b><small>Total XP</small></article><article><b>❤️ {profile?.hearts ?? 0}/{profile?.max_hearts ?? 5}</b><small>Hearts</small></article><article><b>🎯 {xp}/{goal}</b><small>Daily goal XP</small></article></div>
            <h2 className="subsection-title">Achievements</h2><div className="feature-stack">{(profile?.achievements ?? []).map((a) => <article className={`profile-badge${a.unlocked ? " badge-unlocked" : ""}`} key={a.id}><span>{a.icon}</span><span><b>{a.title}</b><small>{a.description}</small></span><small>{a.unlocked ? "Unlocked" : "Locked"}</small></article>)}</div>
          </>}
          {section === "more" && <><p className="muted-copy">Choose another part of your learning space.</p><div className="more-links-grid">{[{ href: "/", icon: "🏠", label: "Learn" }, { href: "/practice", icon: "🏋️", label: "Practice" }, { href: "/leaderboards", icon: "🏆", label: "Leaderboards" }, { href: "/quests", icon: "🧰", label: "Quests" }, { href: "/shop", icon: "🏪", label: "Shop" }, { href: "/profile", icon: "👤", label: "Profile" }].map((item) => <Link className="more-link-card" href={item.href} key={item.href}>{item.icon}<b>{item.label}</b><span>Open page →</span></Link>)}</div></>}
        </section>
        <aside className="section-rail"><article className="rail-card"><p className="eyebrow">DAILY GOAL</p><h2>{xp} / {goal} XP</h2><progress value={progress} max="100"/><p>{progress >= 100 ? "Daily goal complete!" : "Keep your progress going."}</p><div className="rail-stat"><span>Longest streak</span><b>{profile?.longest_streak ?? 0} days</b></div><div className="rail-stat"><span>Course units</span><b>2</b></div></article><article className="rail-card"><p className="eyebrow">KEEP LEARNING</p><h2>One lesson at a time</h2><p>Continue your path and earn XP.</p><Link className="primary-action" href="/">Go to Learn</Link></article></aside>
      </div>
    </main>
  );
}
