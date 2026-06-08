import { NavLink } from "react-router-dom";

// 학습 모드 선택 (어휘 카드 / 퀴즈 풀기 / 오답 복습) — 라우트 기반 내비게이션
const MODES: { to: string; label: string }[] = [
  { to: "/cards", label: "📇 어휘 카드" },
  { to: "/quiz", label: "📝 퀴즈 풀기" },
  { to: "/review", label: "🔁 오답 복습" },
];

export default function ModeTabs() {
  return (
    <nav className="button-row mode-tabs" aria-label="학습 모드 선택">
      {MODES.map((mode) => (
        <NavLink
          key={mode.to}
          to={mode.to}
          className={({ isActive }) => `pill ${isActive ? "active" : ""}`}
        >
          {mode.label}
        </NavLink>
      ))}
    </nav>
  );
}
