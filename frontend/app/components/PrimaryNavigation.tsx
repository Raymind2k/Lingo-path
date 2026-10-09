import Link from "next/link";

export type AppSection = "learn" | "practice" | "leaderboards" | "quests" | "shop" | "profile" | "more";

const items: { id: AppSection; label: string; icon: string; href: string }[] = [
  { id: "learn", label: "Learn", icon: "🏠", href: "/" },
  { id: "practice", label: "Practice", icon: "🏋️", href: "/practice" },
  { id: "leaderboards", label: "Leaderboards", icon: "🏆", href: "/leaderboards" },
  { id: "quests", label: "Quests", icon: "🧰", href: "/quests" },
  { id: "shop", label: "Shop", icon: "🏪", href: "/shop" },
  { id: "profile", label: "Profile", icon: "👤", href: "/profile" },
  { id: "more", label: "More", icon: "•••", href: "/more" },
];

export default function PrimaryNavigation({ activePage }: { activePage: AppSection }) {
  return (
    <nav className="primary-nav" aria-label="Main navigation">
      <Link className="nav-brand" href="/" aria-label="Lingo Path home">
        <span className="brand-mark">L</span><span>Lingo Path</span>
      </Link>
      {items.map((item) => (
        <Link
          className={`nav-item${activePage === item.id ? " nav-item-active" : ""}`}
          href={item.href}
          key={item.id}
          aria-current={activePage === item.id ? "page" : undefined}
        >
          <span aria-hidden="true">{item.icon}</span>{item.label}
        </Link>
      ))}
      <div className="nav-note">
        <span aria-hidden="true">🦉</span>
        <strong>Ready for a lesson?</strong>
        <span>Keep your learning streak going.</span>
      </div>
    </nav>
  );
}
