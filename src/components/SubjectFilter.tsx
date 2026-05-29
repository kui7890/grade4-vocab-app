import type { SubjectFilterValue } from "../types";

// 과목 선택 버튼 (전체 / 국어 / 사회 / 과학)
const SUBJECTS: SubjectFilterValue[] = ["전체", "국어", "사회", "과학"];

interface Props {
  value: SubjectFilterValue;
  onChange: (value: SubjectFilterValue) => void;
}

export default function SubjectFilter({ value, onChange }: Props) {
  return (
    <div className="button-row" role="group" aria-label="교과 선택">
      {SUBJECTS.map((subject) => (
        <button
          key={subject}
          className={`pill ${value === subject ? "active" : ""}`}
          aria-pressed={value === subject}
          onClick={() => onChange(subject)}
        >
          {subject}
        </button>
      ))}
    </div>
  );
}
