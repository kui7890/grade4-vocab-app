import { NavLink } from "react-router-dom";

// 메인 내비게이션 (대시보드 / 어휘 카드 / 퀴즈 / 오답 복습)
const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "🏠 대시보드", end: true },
  { to: "/cards", label: "📇 어휘 카드" },
  { to: "/quiz", label: "📝 퀴즈 풀기" },
  { to: "/review", label: "🔁 오답 복습" },
];

export default function MainNav() {
  return (
    <nav className="button-row mode-tabs" aria-label="주요 메뉴">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `pill ${isActive ? "active" : ""}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
