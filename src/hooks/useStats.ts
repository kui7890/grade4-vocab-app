import { useCallback, useEffect, useState } from "react";
import { fetchStats, recordAnswerRemote } from "../lib/api";

// 학생별 누적 퀴즈 통계(시도 수, 정답 수)를 Supabase에 저장하는 훅
export interface Stats {
  attempts: number; // 푼 문항 총 개수
  correct: number; // 맞힌 문항 총 개수
}

export function useStats(studentId: string | null) {
  const [stats, setStats] = useState<Stats>({ attempts: 0, correct: 0 });

  // 로그인 학생이 바뀌면 서버에서 통계를 불러옵니다.
  useEffect(() => {
    if (!studentId) {
      setStats({ attempts: 0, correct: 0 });
      return;
    }
    let active = true;
    fetchStats(studentId)
      .then((s) => {
        if (active) setStats(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [studentId]);

  // 한 문항 결과를 통계에 반영 (화면 즉시 반영 후 서버 누적)
  const recordAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!studentId) return;
      setStats((prev) => ({
        attempts: prev.attempts + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
      }));
      recordAnswerRemote(studentId, isCorrect).catch(() => {});
    },
    [studentId]
  );

  // 정답률(%) 계산
  const accuracy = stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);

  return { stats, recordAnswer, accuracy };
}
