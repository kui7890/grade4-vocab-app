import { useCallback, useEffect, useState } from "react";

// 누적 퀴즈 통계(시도 수, 정답 수)를 localStorage에 저장하는 훅
const STORAGE_KEY = "grade4_vocab_stats_v1";

export interface Stats {
  attempts: number; // 푼 문항 총 개수
  correct: number; // 맞힌 문항 총 개수
}

function readFromStorage(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, correct: 0 };
    const parsed = JSON.parse(raw);
    return {
      attempts: Number(parsed?.attempts) || 0,
      correct: Number(parsed?.correct) || 0,
    };
  } catch {
    return { attempts: 0, correct: 0 };
  }
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(() => readFromStorage());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // 무시
    }
  }, [stats]);

  // 한 문항 결과를 통계에 반영
  const recordAnswer = useCallback((isCorrect: boolean) => {
    setStats((prev) => ({
      attempts: prev.attempts + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }));
  }, []);

  // 정답률(%) 계산
  const accuracy = stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);

  return { stats, recordAnswer, accuracy };
}
