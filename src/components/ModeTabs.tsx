import type { Mode } from "../types";

// 학습 모드 선택 (어휘 카드 / 퀴즈 풀기 / 오답 복습)
const MODES: { value: Mode; label: string }[] = [
  { value: "card", label: "📇 어휘 카드" },
  { value: "quiz", label: "📝 퀴즈 풀기" },
  { value: "review", label: "🔁 오답 복습" },
];

interface Props {
  value: Mode;
  onChange: (value: Mode) => void;
}

export default function ModeTabs({ value, onChange }: Props) {
  return (
    <div className="button-row mode-tabs" role="group" aria-label="학습 모드 선택">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          className={`pill ${value === mode.value ? "active" : ""}`}
          aria-pressed={value === mode.value}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
