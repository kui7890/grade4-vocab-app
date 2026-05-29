import type { SubjectFilterValue } from "../types";

// 현재 학습 상태 요약 (선택 과목 / 어휘 수 / 오답 수 / 정답률)
interface Props {
  subject: SubjectFilterValue;
  wordCount: number;
  wrongCount: number;
  accuracy: number;
  attempts: number;
}

export default function StatusBar({ subject, wordCount, wrongCount, accuracy, attempts }: Props) {
  return (
    <div className="statusbar">
      <span className="status-chip">
        교과 <b>{subject}</b>
      </span>
      <span className="status-chip">
        학습 어휘 <b>{wordCount}</b>개
      </span>
      <span className="status-chip">
        저장된 오답 <b>{wrongCount}</b>개
      </span>
      <span className="status-chip">
        정답률 <b>{attempts === 0 ? "-" : `${accuracy}%`}</b>
      </span>
    </div>
  );
}
